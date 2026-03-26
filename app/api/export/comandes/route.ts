// GET /api/export/comandes?mes=YYYY-MM  (o sense paràmetre = totes)
// Retorna un fitxer CSV amb les comandes

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const mes = searchParams.get('mes') // format YYYY-MM

    const filter: Record<string, any> = {}
    if (mes) {
      const [year, month] = mes.split('-').map(Number)
      const from = new Date(year, month - 1, 1)
      const to   = new Date(year, month, 1)
      filter.createdAt = { $gte: from, $lt: to }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean()

    const headers = [
      'Núm. comanda', 'Data', 'Estat',
      'Nom client', 'Email', 'Telèfon', 'Empresa',
      'Productes', 'Gorres totals',
      'Subtotal', 'Descompte', 'Recàrrec urgència', 'Enviament', 'Total',
      'Pagament method', 'Bestreta', 'Pagament final', 'Pendent',
      'Tipus lliurament', 'Adreça', 'Ciutat',
    ]

    const rows = orders.map((o: any) => {
      const totalQty  = (o.items ?? []).reduce((s: number, i: any) => s + i.quantity, 0)
      const products  = (o.items ?? []).map((i: any) => `${i.quantity}x ${i.productType}`).join(' / ')
      const totalPaid = (o.payment?.depositPaid ?? 0) + (o.payment?.finalPaid ?? 0)
      const pendent   = (o.pricing?.total ?? 0) - totalPaid

      return [
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString('ca-ES'),
        o.status,
        o.client?.name,
        o.client?.email,
        o.client?.phone,
        o.client?.company ?? '',
        products,
        totalQty,
        o.pricing?.subtotal?.toFixed(2),
        o.pricing?.discountAmt?.toFixed(2),
        o.pricing?.urgencyAmt?.toFixed(2),
        o.pricing?.shippingCost?.toFixed(2),
        o.pricing?.total?.toFixed(2),
        o.payment?.method,
        o.payment?.depositPaid?.toFixed(2),
        o.payment?.finalPaid?.toFixed(2),
        pendent.toFixed(2),
        o.delivery?.type,
        o.delivery?.address ?? '',
        o.delivery?.city ?? '',
      ].map(esc).join(',')
    })

    const csv      = [headers.map(esc).join(','), ...rows].join('\r\n')
    const filename = mes ? `comandes-${mes}.csv` : 'comandes-totes.csv'

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[export/comandes]', err)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
