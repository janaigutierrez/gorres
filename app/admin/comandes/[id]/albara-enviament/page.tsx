// Albara d'enviament — document per al transportista (per signar)
// Server component

export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import { notFound } from 'next/navigation'
import PrintButton from '../albara/PrintButton'

interface PageProps {
  params: Promise<{ id: string }>
}

const PRODUCT_LABELS: Record<string, string> = {
  basic:      'Gorra Basica',
  logo:       'Gorra amb Logo',
  color_logo: 'Gorra Color + Logo',
  deluxe:     'Gorra Deluxe',
  souvenir:   'Gorra Souvenir',
}

export default async function AlbaraEnviamentPage({ params }: PageProps) {
  const { id } = await params
  await connectDB()
  const order = await Order.findById(id).lean()
  if (!order) notFound()

  const o = order as any
  const isShipping = o.delivery?.type === 'shipping'

  if (!isShipping) notFound() // Document només per a enviaments

  const totalQty    = o.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0
  const totalBoxes  = Math.ceil(totalQty / 10)
  const totalPaid   = (o.payment?.depositPaid ?? 0) + (o.payment?.finalPaid ?? 0)
  const pending     = o.pricing.total - totalPaid

  const dateStr = new Date().toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const orderDateStr = new Date(o.createdAt).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const address = [o.delivery?.address, o.delivery?.city].filter(Boolean).join(', ') || 'No especificada'

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .doc-wrap { border: none !important; box-shadow: none; }
        }
        * { font-family: Arial, sans-serif; box-sizing: border-box; }
        body { background: #f3f4f6; }
        .doc-wrap { background: white; padding: 28px; margin: 16px auto; max-width: 740px; border: 1px solid #d1d5db; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
        td { padding: 8px 12px; font-size: 12px; color: #111827; border-bottom: 1px solid #f3f4f6; }
        .label { color: #4b5563; font-size: 11px; }
        .value { color: #111827; font-weight: 500; }
        .sig-box { border: 2px solid #d1d5db; border-radius: 6px; height: 80px; width: 100%; }
      `}</style>

      <PrintButton />

      <div className="doc-wrap">

        {/* Capçalera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '2px solid #111827', paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 2 }}>GORRES PET</div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>ALBARÀ D&apos;ENVIAMENT</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Document per al transportista · Cal retornar signat</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{o.orderNumber}</div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>Data enviament: {dateStr}</div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>Data comanda: {orderDateStr}</div>
          </div>
        </div>

        {/* Grid: Remitent + Destinatari */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 14, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Remitent
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <strong>Gorres PET</strong><br/>
              Caldes de Montbui, Vallès<br/>
              comandes@gorrespet.cat
            </div>
          </div>

          <div style={{ padding: 14, background: '#eff6ff', borderRadius: 8, border: '2px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Destinatari
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <strong>{o.client?.name}</strong>
              {o.client?.company && <><br/>{o.client.company}</>}
              <br/>{address}
              <br/>{o.client?.phone}
            </div>
          </div>
        </div>

        {/* Detall del paquet */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contingut del paquet
          </div>
          <table>
            <thead>
              <tr>
                <th>Producte</th>
                <th style={{ textAlign: 'center' }}>Quantitat</th>
                <th>Color</th>
                <th>Observacions</th>
              </tr>
            </thead>
            <tbody>
              {o.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{PRODUCT_LABELS[item.productType] ?? item.productType}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity} u</td>
                  <td>{item.color}</td>
                  <td style={{ fontSize: 11, color: '#6b7280' }}>
                    {item.logo?.hasLogo && `Logo ${item.logo.size === 'large' ? 'gran' : 'petit'} `}
                    {item.labelInner && 'Etiqueta interior '}
                    {item.packaging !== 'basic' && `Packaging ${item.packaging}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resum de l'enviament */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{totalQty}</div>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>GORRES TOTALS</div>
          </div>
          <div style={{ padding: 12, background: '#fefce8', borderRadius: 8, border: '1px solid #fde68a', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#854d0e' }}>{totalBoxes}</div>
            <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>CAIXES (~10 gorres/caixa)</div>
          </div>
          <div style={{ padding: 12, background: pending > 0 ? '#fff7ed' : '#f0fdf4', borderRadius: 8, border: `1px solid ${pending > 0 ? '#fed7aa' : '#bbf7d0'}`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: pending > 0 ? '#c2410c' : '#166534' }}>
              {pending > 0 ? `${pending.toFixed(2)}€` : 'PAGAT'}
            </div>
            <div style={{ fontSize: 11, color: pending > 0 ? '#c2410c' : '#166534', fontWeight: 600 }}>
              {pending > 0 ? 'PENDENT DE COBRAMENT' : 'PAGAMENT COMPLET'}
            </div>
          </div>
        </div>

        {/* Notes de transport */}
        {o.delivery?.notes && (
          <div style={{ marginBottom: 20, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>NOTES DE TRANSPORT</div>
            <div style={{ fontSize: 12, color: '#78350f' }}>{o.delivery.notes}</div>
          </div>
        )}

        {/* Camp de notes per al transportista */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Observacions del transportista
          </div>
          <div className="sig-box" style={{ height: 56 }}></div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Signatura transportista
            </div>
            <div className="sig-box"></div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
              Nom: __________________________ &nbsp; Data: ___________
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Signatura destinatari (en recepció)
            </div>
            <div className="sig-box"></div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
              Nom: __________________________ &nbsp; Data: ___________
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
          <span>Gorres PET · Caldes de Montbui · gorrespet.cat</span>
          <span>{o.orderNumber} · Albarà d&apos;enviament</span>
        </div>
      </div>
    </>
  )
}
