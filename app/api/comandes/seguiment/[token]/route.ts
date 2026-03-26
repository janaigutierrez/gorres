// API: GET /api/comandes/seguiment/[token]
// Obté l'estat d'una comanda per token (client convidat, sense login)

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length < 32) {
      return NextResponse.json({ error: 'Token invàlid' }, { status: 400 })
    }

    await connectDB()

    const order = await Order.findOne({ guestToken: token }).lean()

    if (!order) {
      return NextResponse.json({ error: 'Comanda no trobada' }, { status: 404 })
    }

    // Retornem només els camps necessaris per al client (sense notes internes)
    return NextResponse.json({
      orderNumber:   order.orderNumber,
      status:        order.status,
      client: {
        name:    order.client.name,
        email:   order.client.email,
      },
      items:         order.items,
      pricing:       order.pricing,
      payment: {
        method:      order.payment.method,
        status:      order.payment.status,
        depositPaid: order.payment.depositPaid,
        finalPaid:   order.payment.finalPaid,
        total:       order.pricing.total,
        pending:     order.pricing.total - order.payment.depositPaid - order.payment.finalPaid,
      },
      delivery: {
        type:          order.delivery.type,
        scheduledDate: order.delivery.scheduledDate,
        deliveredDate: order.delivery.deliveredDate,
      },
      clientNotes: order.clientNotes,
      createdAt:   order.createdAt,
      updatedAt:   order.updatedAt,
    })
  } catch (error) {
    console.error('[API seguiment]', error)
    return NextResponse.json(
      { error: 'Error intern del servidor' },
      { status: 500 }
    )
  }
}
