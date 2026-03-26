// API: GET /api/estoc/moviments — Historial de moviments d'estoc

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Stock, StockMovement } from '@/models/Stock'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const stockId = searchParams.get('stockId')
    const limit   = parseInt(searchParams.get('limit') ?? '50')

    const filter = stockId ? { stockId } : {}

    const moviments = await StockMovement
      .find(filter)
      .sort({ date: -1 })
      .limit(limit)
      .populate('stockId', 'name type unit')
      .lean()

    return NextResponse.json(moviments)
  } catch (error) {
    console.error('[API estoc moviments]', error)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
