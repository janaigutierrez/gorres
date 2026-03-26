// API: GET  /api/configuracio — Retorna config de preus activa
//      POST /api/configuracio — Desa nova config (upsert)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { PricingConfig } from '@/models/PricingConfig'
import { DEFAULT_PRICING } from '@/lib/pricing'

const VolumeDiscountSchema = z.object({
  minQty:   z.number().min(1),
  maxQty:   z.number().min(1),
  discount: z.number().min(0).max(1),
})

const ConfigSchema = z.object({
  products: z.object({
    basic:      z.object({ basePrice: z.number().min(0) }),
    logo:       z.object({ basePrice: z.number().min(0) }),
    color_logo: z.object({ basePrice: z.number().min(0) }),
    deluxe:     z.object({ basePrice: z.number().min(0) }),
    souvenir:   z.object({ basePrice: z.number().min(0) }),
  }),
  extras: z.object({
    color:             z.object({ price: z.number().min(0) }),
    logoLarge:         z.object({ price: z.number().min(0) }),
    packagingDeluxe:   z.object({ price: z.number().min(0) }),
    packagingSouvenir: z.object({ price: z.number().min(0) }),
    urgency:           z.object({ multiplier: z.number().min(1) }),
    labelInner:        z.object({ price: z.number().min(0) }),
  }),
  volumeDiscounts: z.array(VolumeDiscountSchema),
  productionDays: z.object({
    standard: z.number().min(1),
    urgent:   z.number().min(1),
  }),
})

export async function GET() {
  try {
    await connectDB()
    const config = await PricingConfig.findOne().lean()
    return NextResponse.json(config ?? DEFAULT_PRICING)
  } catch {
    return NextResponse.json(DEFAULT_PRICING)
  }
}

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = ConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dades invàlides', details: parsed.error.issues }, { status: 400 })
    }

    await connectDB()
    await PricingConfig.findOneAndUpdate({}, parsed.data, { upsert: true, new: true, runValidators: false })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API configuracio POST]', error)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
