// DELETE /api/admin/dades
// Operacions destructives de la base de dades (zona de perill)
// Body: { action: 'delete-old' | 'reset-all', months?: number }

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

const Schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('delete-old'),
    months: z.number().min(1).max(60),
  }),
  z.object({
    action: z.literal('reset-all'),
  }),
])

export async function DELETE(req: Request) {
  try {
    const body   = await req.json()
    const parsed = Schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dades invàlides' }, { status: 400 })
    }

    await connectDB()

    if (parsed.data.action === 'delete-old') {
      const { months } = parsed.data
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - months)

      const result = await Order.deleteMany({
        status:    { $in: ['COMPLETADA', 'CANCELLADA'] },
        createdAt: { $lt: cutoff },
      })
      return NextResponse.json({ deleted: result.deletedCount })
    }

    if (parsed.data.action === 'reset-all') {
      const result = await Order.deleteMany({})
      return NextResponse.json({ deleted: result.deletedCount })
    }
  } catch (err) {
    console.error('[admin/dades DELETE]', err)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
