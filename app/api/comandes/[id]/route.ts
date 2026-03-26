// API: GET  /api/comandes/[id] — Detall comanda
//      PATCH /api/comandes/[id] — Actualitzar comanda (estat, pagament, notes)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import {
  sendOrderConfirmedToClient,
  sendOrderInProductionToClient,
  sendOrderReadyToClient,
  sendOrderShippedToClient,
  sendOrderCompletedToClient,
} from '@/lib/email'

type Params = { params: Promise<{ id: string }> }

// --- GET ---
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  await connectDB()
  const order = await Order.findById(id).lean()
  if (!order) return NextResponse.json({ error: 'No trobada' }, { status: 404 })
  return NextResponse.json(order)
}

// --- PATCH ---
const PatchSchema = z.object({
  // Canvi d'estat
  status: z.enum(['NOVA_SOLICITUD', 'CONFIRMADA', 'EN_PRODUCCIO', 'PREPARADA', 'ENVIADA', 'COMPLETADA', 'CANCELLADA']).optional(),
  // Notes
  notes: z.string().optional(),
  // Notes de producció
  productionNotes: z.string().optional(),
  productionBottlesUsed: z.number().optional(),
  // Pagament
  depositPaid: z.number().optional(),
  depositDate: z.string().optional(),
  finalPaid: z.number().optional(),
  finalDate: z.string().optional(),
  // Data lliurament
  scheduledDate: z.string().optional(),
  deliveredDate: z.string().optional(),
  // Notes transport (agrupació, nº seguiment...)
  trackingNotes: z.string().optional(),
})

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dades invàlides', details: parsed.error.issues }, { status: 400 })
    }

    await connectDB()
    const order = await Order.findById(id)
    if (!order) return NextResponse.json({ error: 'No trobada' }, { status: 404 })

    const d = parsed.data

    if (d.status !== undefined)              order.status = d.status
    if (d.notes !== undefined)               order.notes = d.notes
    if (d.productionNotes !== undefined)     order.production.notes = d.productionNotes
    if (d.productionBottlesUsed !== undefined) order.production.bottlesUsed = d.productionBottlesUsed
    if (d.depositPaid !== undefined)         order.payment.depositPaid = d.depositPaid
    if (d.depositDate !== undefined)         order.payment.depositDate = new Date(d.depositDate)
    if (d.finalPaid !== undefined)           order.payment.finalPaid = d.finalPaid
    if (d.finalDate !== undefined)           order.payment.finalDate = new Date(d.finalDate)
    if (d.scheduledDate !== undefined)       order.delivery.scheduledDate = new Date(d.scheduledDate)
    if (d.deliveredDate !== undefined)       order.delivery.deliveredDate = new Date(d.deliveredDate)
    if (d.trackingNotes !== undefined)       order.delivery.notes = d.trackingNotes

    // Actualitzar estat de pagament automàticament
    const totalPaid = order.payment.depositPaid + order.payment.finalPaid
    if (totalPaid >= order.pricing.total)          order.payment.status = 'paid'
    else if (totalPaid > 0)                        order.payment.status = 'partial'
    else                                           order.payment.status = 'pending'

    // Si marca com a completada, posar data de lliurament si no n'hi ha
    if (d.status === 'COMPLETADA' && !order.delivery.deliveredDate) {
      order.delivery.deliveredDate = new Date()
    }
    // Si inicia producció, posar data d'inici
    if (d.status === 'EN_PRODUCCIO' && !order.production.startDate) {
      order.production.startDate = new Date()
    }

    await order.save()

    // Emails per canvi d'estat (només clients reals, no manuals)
    const isRealClient = order.guestToken && !order.client.email.includes('@manual.')
    if (isRealClient && d.status) {
      const emailBase = {
        to:            order.client.email,
        orderNumber:   order.orderNumber,
        clientName:    order.client.name,
        trackingToken: order.guestToken!,
      }

      if (d.status === 'CONFIRMADA') {
        sendOrderConfirmedToClient({
          ...emailBase,
          total:         order.pricing.total,
          paymentMethod: order.payment.method,
          deliveryDate:  order.delivery.scheduledDate,
        }).catch(console.error)
      } else if (d.status === 'EN_PRODUCCIO') {
        sendOrderInProductionToClient({
          ...emailBase,
          deliveryDate: order.delivery.scheduledDate,
        }).catch(console.error)
      } else if (d.status === 'PREPARADA') {
        sendOrderReadyToClient({
          ...emailBase,
          deliveryType:  order.delivery.type,
          scheduledDate: order.delivery.scheduledDate,
        }).catch(console.error)
      } else if (d.status === 'ENVIADA') {
        const addr = [order.delivery.address, order.delivery.city].filter(Boolean).join(', ')
        sendOrderShippedToClient({
          ...emailBase,
          deliveryAddress: addr || null,
        }).catch(console.error)
      } else if (d.status === 'COMPLETADA') {
        sendOrderCompletedToClient({
          ...emailBase,
          total: order.pricing.total,
        }).catch(console.error)
      }
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('[API comandes PATCH]', error)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
