// API: POST /api/comandes — Crear nova comanda (client o convidat)
//      GET  /api/comandes — Llistar comandes (admin)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { calculateOrderPrice, calculateDeliveryDate, calculateUnitPrice, getShippingCost } from '@/lib/pricing'
import { getActivePricingConfig } from '@/models/PricingConfig'
import Order from '@/models/Order'
import { sendNewOrderToClient, sendNewOrderToAdmin } from '@/lib/email'

// --- Schema de creació de comanda ---
const LogoSchema = z.object({
  hasLogo:  z.boolean(),
  size:     z.union([z.enum(['small', 'large']), z.null()]),
  imageUrl: z.union([z.string(), z.null()]),
  notes:    z.union([z.string(), z.null()]),
})

const ItemSchema = z.object({
  productType: z.enum(['basic', 'logo', 'color_logo', 'deluxe', 'souvenir']),
  quantity:    z.number().min(10),
  color:       z.string(),
  logo:        LogoSchema,
  packaging:   z.enum(['basic', 'deluxe', 'souvenir_box']),
  labelInner:  z.boolean(),
})

const CreateOrderSchema = z.object({
  items:    z.array(ItemSchema).min(1),
  urgent:   z.boolean(),
  client: z.object({
    name:    z.string().min(2),
    email:   z.string().email(),
    phone:   z.string().min(9),
    company: z.union([z.string(), z.null()]).optional(),
  }),
  delivery: z.object({
    type:         z.enum(['local', 'shipping']),
    address:      z.union([z.string(), z.null()]).optional(),
    city:         z.union([z.string(), z.null()]).optional(),
    notes:        z.union([z.string(), z.null()]).optional(),
    shippingZone: z.string().optional(),
  }),
  payment: z.object({
    method: z.enum(['bizum', 'transfer', 'cash']),
  }),
  clientNotes: z.union([z.string(), z.null()]).optional(),
})

// --- POST: Crear nova comanda ---
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateOrderSchema.safeParse(body)

    if (!parsed.success) {
      console.error('[API comandes POST] Validació fallida:', JSON.stringify(parsed.error.issues))
      return NextResponse.json(
        { error: 'Dades invàlides', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { items, urgent, client, delivery, payment, clientNotes } = parsed.data

    await connectDB()

    // Generar número de comanda: GPT-YYYY-NNN
    const year = new Date().getFullYear()
    const count = await Order.countDocuments() + 1
    const orderNumber = `GPT-${year}-${String(count).padStart(3, '0')}`

    // Recalcular el preu al servidor (no confiem en el client)
    const config = await getActivePricingConfig()
    const totalQty = items.reduce((s, i) => s + i.quantity, 0)
    const shippingCost = getShippingCost(delivery.shippingZone, delivery.type, totalQty)
    const pricing = calculateOrderPrice(items, config, { urgent, shippingCost })
    const deliveryDate = calculateDeliveryDate(config, urgent)

    // Calcular preus per item
    const itemsWithPrices = items.map((item) => {
      const unitPrice = calculateUnitPrice(item, config)
      return {
        ...item,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      }
    })

    // Token únic per a seguiment sense login
    const guestToken = crypto.randomBytes(32).toString('hex')

    const order = await Order.create({
      orderNumber,
      client: {
        type:    'guest',
        userId:  null,
        name:    client.name,
        email:   client.email,
        phone:   client.phone,
        company: client.company ?? null,
      },
      items: itemsWithPrices,
      pricing: {
        subtotal:     pricing.subtotal,
        discount:     pricing.discountPct,
        discountAmt:  pricing.discountAmt,
        urgency:      urgent,
        urgencyAmt:   pricing.urgencyAmt,
        shippingCost: pricing.shippingCost,
        total:        pricing.total,
      },
      payment: {
        method:      payment.method,
        status:      'pending',
        depositPaid: 0,
        finalPaid:   0,
      },
      delivery: {
        type:          delivery.type,
        address:       delivery.address ?? null,
        city:          delivery.city ?? null,
        scheduledDate: deliveryDate,
        notes:         delivery.notes ?? null,
      },
      production: {
        bottlesUsed: 0,
      },
      guestToken,
      clientNotes: clientNotes ?? null,
    })

    // Emails no bloquejants (si fallen no afecten la resposta)
    const isManualEmail = client.email.includes('@manual.')
    if (!isManualEmail) {
      sendNewOrderToClient({
        to:           client.email,
        orderNumber,
        clientName:   client.name,
        trackingToken: guestToken,
        total:        pricing.total,
        items:        itemsWithPrices.map(i => ({ productType: i.productType, quantity: i.quantity })),
        deliveryDate,
        paymentMethod: payment.method,
      }).catch(console.error)
    }
    sendNewOrderToAdmin({
      orderNumber,
      clientName:  client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      total:       pricing.total,
      items:       itemsWithPrices.map(i => ({ productType: i.productType, quantity: i.quantity })),
      orderId:     String(order._id),
    }).catch(console.error)

    return NextResponse.json(
      {
        success:     true,
        orderNumber: order.orderNumber,
        orderId:     order._id,
        guestToken,
        trackingUrl: `/seguiment/${guestToken}`,
        total:       pricing.total,
        deliveryDate: deliveryDate.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API comandes POST]', error)
    return NextResponse.json({ error: 'Error intern del servidor' }, { status: 500 })
  }
}

// --- GET: Llistar comandes (admin) ---
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page')  ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const estat = searchParams.get('estat')
    const cerca = searchParams.get('cerca')

    const filter: Record<string, any> = {}
    if (estat) filter.status = estat
    if (cerca) {
      filter.$or = [
        { orderNumber: { $regex: cerca, $options: 'i' } },
        { 'client.name': { $regex: cerca, $options: 'i' } },
        { 'client.email': { $regex: cerca, $options: 'i' } },
      ]
    }

    const [comandes, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ])

    return NextResponse.json({ comandes, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[API comandes GET]', error)
    return NextResponse.json({ error: 'Error intern del servidor' }, { status: 500 })
  }
}
