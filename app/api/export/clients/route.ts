// GET /api/export/clients
// Retorna un CSV amb l'agenda de clients (agrupats per email)

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export async function GET() {
  try {
    await connectDB()

    const result = await Order.aggregate([
      {
        $group: {
          _id:            '$client.email',
          nom:            { $last: '$client.name' },
          email:          { $first: '$client.email' },
          telefon:        { $last: '$client.phone' },
          empresa:        { $last: '$client.company' },
          totalComandes:  { $sum: 1 },
          totalGastat:    { $sum: '$pricing.total' },
          gorresTotal:    { $sum: { $sum: '$items.quantity' } },
          primeraComanda: { $min: '$createdAt' },
          ultimaComanda:  { $max: '$createdAt' },
        },
      },
      { $sort: { totalComandes: -1 } },
    ])

    const headers = [
      'Nom', 'Email', 'Telèfon', 'Empresa',
      'Núm. comandes', 'Total gastat (€)', 'Gorres totals',
      'Primera comanda', 'Última comanda',
    ]

    const rows = result.map((c: any) => [
      c.nom,
      c.email,
      c.telefon,
      c.empresa ?? '',
      c.totalComandes,
      c.totalGastat?.toFixed(2),
      c.gorresTotal ?? 0,
      new Date(c.primeraComanda).toLocaleDateString('ca-ES'),
      new Date(c.ultimaComanda).toLocaleDateString('ca-ES'),
    ].map(esc).join(','))

    const csv = [headers.map(esc).join(','), ...rows].join('\r\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clients.csv"',
      },
    })
  } catch (err) {
    console.error('[export/clients]', err)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
