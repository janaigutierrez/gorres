// Albara de venda — pagina imprimible
// Server component — no 'use client'

export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

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

const PAYMENT_LABELS: Record<string, string> = {
  bizum:    'Bizum',
  transfer: 'Transferencia bancaria',
  cash:     'Efectiu',
}

export default async function AlbaraPage({ params }: PageProps) {
  const { id } = await params
  await connectDB()
  const order = await Order.findById(id).lean()
  if (!order) notFound()

  const o = order as any
  const totalQty = o.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0
  const totalPaid = (o.payment?.depositPaid ?? 0) + (o.payment?.finalPaid ?? 0)
  const pending = o.pricing.total - totalPaid
  const dateStr = new Date(o.createdAt).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const isShipping = o.delivery?.type === 'shipping'
  const deliveryStr = isShipping
    ? `Enviament — ${[o.delivery?.address, o.delivery?.city].filter(Boolean).join(', ')}`
    : 'Recollida local (Valles / provincia)'
  const estimatedDate = o.delivery?.scheduledDate
    ? new Date(o.delivery.scheduledDate).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'A confirmar'

  const copies = [
    { label: 'Copia client' },
    { label: 'Copia empresa' },
    { label: 'Copia transport (si aplica)' },
  ]

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .page-break { page-break-after: always; break-after: page; }
          .albara-copy { border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; box-shadow: none; }
          .copy-separator { page-break-before: always; break-before: page; border-top: none; padding-top: 0; }
        }
        * { font-family: Arial, sans-serif; box-sizing: border-box; }
        body { background: #f3f4f6; }
        .albara-copy { background: white; padding: 28px; margin: 16px auto; max-width: 740px; border: 1px solid #d1d5db; border-radius: 6px; }
        .copy-separator { border-top: 2px dashed #9ca3af; text-align: center; color: #6b7280; font-size: 11px; padding: 6px 0; margin: 0 auto; max-width: 740px; background: white; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
        td { padding: 8px 12px; font-size: 12px; color: #111827; border-bottom: 1px solid #f3f4f6; }
        .label { color: #4b5563; font-size: 11px; }
        .value { color: #111827; font-weight: 500; }
        .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #d1d5db; }
      `}</style>

      <PrintButton />

      {copies.map((copy, ci) => (
        <div key={ci}>
          {ci > 0 && (
            <div className="copy-separator">
              - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            </div>
          )}
          <div className="albara-copy">
            {/* Capcalera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 2 }}>GORRES PET</div>
                <div style={{ fontSize: 13, color: '#374151' }}>Albara de venda</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{o.orderNumber}</div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>{dateStr}</div>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: 4, display: 'inline-block' }}>
                  {copy.label.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Dades client */}
            <div style={{ marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Client
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                <div><span className="label">Nom: </span><span className="value">{o.client?.name}</span></div>
                <div><span className="label">Email: </span><span className="value">{o.client?.email}</span></div>
                {o.client?.company && <div><span className="label">Empresa: </span><span className="value">{o.client.company}</span></div>}
                <div><span className="label">Telefon: </span><span className="value">{o.client?.phone}</span></div>
              </div>
            </div>

            {/* Taula productes */}
            <table style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th>Producte</th>
                  <th style={{ textAlign: 'center' }}>Quantitat</th>
                  <th style={{ textAlign: 'right' }}>Preu unitari</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {o.items?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td>
                      {PRODUCT_LABELS[item.productType] ?? item.productType}
                      {item.logo?.hasLogo && ` + logo ${item.logo.size === 'large' ? 'gran' : 'petit'}`}
                      {item.packaging !== 'basic' && ` + packaging ${item.packaging}`}
                      {item.labelInner && ' + etiqueta interior'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity} u</td>
                    <td style={{ textAlign: 'right' }}>{item.unitPrice?.toFixed(2)}€</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.subtotal?.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', color: '#4b5563', fontSize: 12 }}>Subtotal</td>
                  <td style={{ textAlign: 'right' }}>{o.pricing.subtotal?.toFixed(2)}€</td>
                </tr>
                {o.pricing.discountAmt > 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', color: '#16a34a', fontSize: 12 }}>
                      Descompte ({(o.pricing.discount * 100).toFixed(0)}%)
                    </td>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>-{o.pricing.discountAmt?.toFixed(2)}€</td>
                  </tr>
                )}
                {o.pricing.urgencyAmt > 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', color: '#ea580c', fontSize: 12 }}>Recàrrec urgencia</td>
                    <td style={{ textAlign: 'right', color: '#ea580c' }}>+{o.pricing.urgencyAmt?.toFixed(2)}€</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td colSpan={3} style={{ textAlign: 'right' }}>TOTAL</td>
                  <td style={{ textAlign: 'right', color: '#166534', fontSize: 16 }}>{o.pricing.total?.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            {/* Pagament i lliurament */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pagament
                </div>
                <div style={{ fontSize: 12 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span className="label">Metode: </span>
                    <span className="value">{PAYMENT_LABELS[o.payment?.method] ?? o.payment?.method}</span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span className="label">Bestreta pagada: </span>
                    <span className="value">{(o.payment?.depositPaid ?? 0).toFixed(2)}€</span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span className="label">Pagament final: </span>
                    <span className="value">{(o.payment?.finalPaid ?? 0).toFixed(2)}€</span>
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 700, color: pending > 0 ? '#d97706' : '#16a34a' }}>
                    {pending > 0 ? `Pendent: ${pending.toFixed(2)}€` : 'Pagat completament'}
                  </div>
                </div>
              </div>

              <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Lliurament
                </div>
                <div style={{ fontSize: 12 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span className="label">Tipus: </span>
                    <span className="value">{isShipping ? 'Enviament' : 'Recollida'}</span>
                  </div>
                  {isShipping && o.delivery?.address && (
                    <div style={{ marginBottom: 4 }}>
                      <span className="label">Adreca: </span>
                      <span className="value">{o.delivery.address}{o.delivery.city ? `, ${o.delivery.city}` : ''}</span>
                    </div>
                  )}
                  {!isShipping && (
                    <div style={{ marginBottom: 4, color: '#374151', fontSize: 11 }}>
                      Recollida local (Valles / provincia)
                    </div>
                  )}
                  <div>
                    <span className="label">Data estimada: </span>
                    <span className="value">{estimatedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>
              Gorres PET · Caldes de Montbui · Valles · gorrespet.cat
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
