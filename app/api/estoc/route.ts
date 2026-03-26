// API: GET  /api/estoc        — Llistar estoc
//      POST /api/estoc        — Crear ítem d'estoc
//      POST /api/estoc/moviment — Registrar entrada/sortida

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { Stock, StockMovement } from '@/models/Stock'

export async function GET() {
  await connectDB()
  const items = await Stock.find().sort({ type: 1, name: 1 }).lean()
  return NextResponse.json(items)
}

const CreateStockSchema = z.object({
  type:      z.enum(['blank_hat', 'pet_bottles', 'yarn', 'packaging']),
  name:      z.string().min(2),
  quantity:  z.number(),
  unit:      z.enum(['units', 'kg', 'bottles']),
  minAlert:  z.number(),
  color:     z.union([z.string(), z.null()]).optional(),
  notes:     z.union([z.string(), z.null()]).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Registrar moviment
    if (body._action === 'moviment') {
      const { stockId, type, quantity, reason } = body
      await connectDB()
      const item = await Stock.findById(stockId)
      if (!item) return NextResponse.json({ error: 'No trobat' }, { status: 404 })

      if (type === 'in')         item.quantity += quantity
      else if (type === 'out')   item.quantity = Math.max(0, item.quantity - quantity)
      else                       item.quantity = quantity  // adjustment

      await item.save()
      await StockMovement.create({ stockId, type, quantity, reason, date: new Date() })
      return NextResponse.json({ success: true, quantity: item.quantity })
    }

    // Crear ítem nou
    const parsed = CreateStockSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dades invàlides' }, { status: 400 })
    await connectDB()
    const item = await Stock.create(parsed.data)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[API estoc]', error)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
