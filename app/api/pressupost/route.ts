// API: POST /api/pressupost
// Càlcul de preu en temps real (sense crear comanda)
// Pública — usada pel configurador de comandes

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { calculateOrderPrice, calculateDeliveryDate, getShippingCost, isShippingCustomQuote, DEFAULT_PRICING } from '@/lib/pricing'
import { getActivePricingConfig } from '@/models/PricingConfig'

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

const PressupostSchema = z.object({
  items:        z.array(ItemSchema).min(1),
  urgent:       z.boolean(),
  deliveryType: z.string().optional(),
  shippingZone: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = PressupostSchema.safeParse(body)

    if (!parsed.success) {
      console.error('[API pressupost] Validació fallida:', JSON.stringify(parsed.error.issues))
      return NextResponse.json(
        { error: 'Dades invàlides', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { items, urgent, deliveryType, shippingZone } = parsed.data

    // Obtenir configuració de preus — si falla MongoDB, usem el default
    let config = DEFAULT_PRICING
    try {
      config = await getActivePricingConfig()
    } catch {
      console.warn('[API pressupost] MongoDB no disponible, usant preus per defecte')
    }

    const totalQty         = items.reduce((s, i) => s + i.quantity, 0)
    const dt               = deliveryType ?? 'local'
    const customQuote      = isShippingCustomQuote(totalQty, dt)
    const shippingCost     = getShippingCost(shippingZone, dt, totalQty)
    const pricing          = calculateOrderPrice(items, config, { urgent, shippingCost })
    const deliveryDate     = calculateDeliveryDate(config, urgent)

    return NextResponse.json({
      pricing,
      deliveryDate:        deliveryDate.toISOString(),
      productionDays:      urgent ? config.productionDays.urgent : config.productionDays.standard,
      shippingCustomQuote: customQuote,
    })
  } catch (error) {
    console.error('[API pressupost]', error)
    return NextResponse.json({ error: 'Error intern del servidor' }, { status: 500 })
  }
}
