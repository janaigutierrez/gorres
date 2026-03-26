// Fitxa de producció — imprimible A4
// Conté tota la informació que el taller necessita per fabricar la comanda

export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import { notFound } from 'next/navigation'
import PrintButton from '../albara/PrintButton'

interface PageProps {
  params: Promise<{ id: string }>
}

const PRODUCT_LABELS: Record<string, string> = {
  basic:      'Gorra Bàsica',
  logo:       'Gorra amb Logo',
  color_logo: 'Gorra Color + Logo',
  deluxe:     'Gorra Deluxe',
  souvenir:   'Gorra Souvenir',
}

const COLOR_HEX: Record<string, string> = {
  natural:  '#D4C4A8', negre:    '#1a1a1a', blau_mar: '#1B4F8C',
  vermell:  '#C0392B', verd:     '#1A6B3A', groc:     '#F4C842',
  taronja:  '#E8742A', rosa:     '#D96B9A', lila:     '#7B4FA0',
  gris:     '#808080',
}

export default async function FitxaProduccioPage({ params }: PageProps) {
  const { id } = await params
  await connectDB()
  const order = await Order.findById(id).lean()
  if (!order) notFound()

  const o = order as any
  const totalQty    = o.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0
  const estBottles  = totalQty * 8
  const dateStr     = new Date(o.createdAt).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const isUrgent    = o.urgent === true
  const isShipping  = o.delivery?.type === 'shipping'
  const scheduledDate = o.delivery?.scheduledDate
    ? new Date(o.delivery.scheduledDate).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'A confirmar'

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .fitxa { border: none !important; box-shadow: none !important; }
        }
        * { font-family: Arial, sans-serif; box-sizing: border-box; }
        body { background: #f3f4f6; }
        .fitxa {
          background: white;
          padding: 32px;
          max-width: 740px;
          margin: 20px auto;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; }
        .title { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
        .subtitle { font-size: 13px; color: #4b5563; margin-top: 2px; }
        .order-num { font-size: 26px; font-weight: 900; color: #111827; text-align: right; }
        .order-date { font-size: 12px; color: #6b7280; text-align: right; margin-top: 2px; }
        .urgent-badge {
          display: inline-block; background: #dc2626; color: white;
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px;
          text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;
        }
        .section { margin-bottom: 20px; }
        .section-title {
          font-size: 10px; font-weight: 700; color: #374151;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;
        }
        .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-size: 13px; }
        .label { color: #6b7280; }
        .value { color: #111827; font-weight: 600; }
        .item-card {
          border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;
        }
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .item-name { font-size: 16px; font-weight: 800; color: #111827; }
        .item-qty { font-size: 28px; font-weight: 900; color: #111827; text-align: right; }
        .item-qty-label { font-size: 11px; color: #6b7280; text-align: right; }
        .item-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .detail-box {
          background: #f9fafb; border-radius: 6px; padding: 8px 10px;
        }
        .detail-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
        .detail-value { font-size: 13px; color: #111827; font-weight: 700; margin-top: 2px; }
        .color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px; }
        .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
        .check-item {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          border: 1.5px solid #d1d5db; border-radius: 6px; font-size: 13px; color: #374151;
        }
        .check-box { width: 18px; height: 18px; border: 2px solid #9ca3af; border-radius: 3px; flex-shrink: 0; }
        .bottles-box {
          background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px;
          padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;
        }
        .bottles-num { font-size: 32px; font-weight: 900; color: #166534; }
        .notes-box {
          border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 12px;
          font-size: 13px; color: #374151; min-height: 60px;
        }
        .delivery-box {
          background: ${isUrgent ? '#fff7ed' : '#f0f9ff'}; border: 2px solid ${isUrgent ? '#fed7aa' : '#bae6fd'};
          border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
        }
        .footer {
          margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb;
          display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;
        }
      `}</style>

      <PrintButton />

      <div className="fitxa">
        {/* Capçalera */}
        <div className="header">
          <div>
            <div className="title">GORRES PET</div>
            <div className="subtitle">Fitxa de producció</div>
            {isUrgent && <div className="urgent-badge">⚡ URGENT — 7 dies hàbils</div>}
          </div>
          <div>
            <div className="order-num">{o.orderNumber}</div>
            <div className="order-date">Sol·licitud: {dateStr}</div>
          </div>
        </div>

        {/* Client */}
        <div className="section">
          <div className="section-title">Client</div>
          <div className="client-grid">
            <div><span className="label">Nom: </span><span className="value">{o.client?.name}</span></div>
            {o.client?.company && <div><span className="label">Empresa: </span><span className="value">{o.client.company}</span></div>}
            <div><span className="label">Telèfon: </span><span className="value">{o.client?.phone}</span></div>
            <div><span className="label">Email: </span><span className="value">{o.client?.email}</span></div>
          </div>
        </div>

        {/* Productes */}
        <div className="section">
          <div className="section-title">Productes a fabricar — {totalQty} unitats totals</div>
          {o.items?.map((item: any, i: number) => {
            const hex = COLOR_HEX[item.color] ?? '#ccc'
            return (
              <div key={i} className="item-card">
                <div className="item-header">
                  <div>
                    <div className="item-name">{PRODUCT_LABELS[item.productType] ?? item.productType}</div>
                  </div>
                  <div>
                    <div className="item-qty">{item.quantity}</div>
                    <div className="item-qty-label">unitats</div>
                  </div>
                </div>
                <div className="item-details">
                  <div className="detail-box">
                    <div className="detail-label">Color</div>
                    <div className="detail-value">
                      <span className="color-dot" style={{ backgroundColor: hex }} />
                      {item.color}
                    </div>
                  </div>
                  <div className="detail-box">
                    <div className="detail-label">Logo brodat</div>
                    <div className="detail-value">
                      {item.logo?.hasLogo
                        ? `Sí — ${item.logo.size === 'large' ? 'Gran (6cm)' : 'Petit (3cm)'}`
                        : 'No'}
                    </div>
                  </div>
                  <div className="detail-box">
                    <div className="detail-label">Packaging</div>
                    <div className="detail-value">
                      {{ basic: 'Bàsic', deluxe: 'Deluxe', souvenir_box: 'Souvenir' }[item.packaging as string] ?? item.packaging}
                    </div>
                  </div>
                  {item.labelInner && (
                    <div className="detail-box" style={{ borderLeft: '3px solid #f59e0b' }}>
                      <div className="detail-label">Etiqueta interior</div>
                      <div className="detail-value">Sí — personalitzada</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Ampolles PET */}
        <div className="section">
          <div className="section-title">Matèria primera</div>
          <div className="bottles-box">
            <div>
              <div style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Ampolles PET necessàries (estimat)</div>
              <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>~8 ampolles per gorra · {totalQty} gorres</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bottles-num">~{estBottles}</div>
              <div style={{ fontSize: 11, color: '#4b5563' }}>ampolles</div>
            </div>
          </div>
        </div>

        {/* Lliurament */}
        <div className="section">
          <div className="section-title">Lliurament</div>
          <div className="delivery-box">
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                {isShipping ? 'Enviament per missatgeria' : 'Recollida local — Vallès / província'}
              </div>
              {isShipping && o.delivery?.address && (
                <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
                  {o.delivery.address}{o.delivery.city ? `, ${o.delivery.city}` : ''}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Data estimada</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{scheduledDate}</div>
            </div>
          </div>
        </div>

        {/* Checklist taller */}
        <div className="section">
          <div className="section-title">Checklist taller</div>
          <div className="checklist">
            {[
              'Gorres blank reservades',
              'Fil reciclat preparat',
              'Color verificat',
              'Logo enviat a brodadora',
              'Packaging preparat',
              'Control de qualitat fet',
            ].map(item => (
              <div key={item} className="check-item">
                <div className="check-box" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes de producció */}
        {o.production?.notes && (
          <div className="section">
            <div className="section-title">Notes de producció</div>
            <div className="notes-box">{o.production.notes}</div>
          </div>
        )}

        {/* Notes client */}
        {o.clientNotes && (
          <div className="section">
            <div className="section-title">Notes del client</div>
            <div className="notes-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>{o.clientNotes}</div>
          </div>
        )}

        {/* Peu de pàgina */}
        <div className="footer">
          <span>Gorres PET · Caldes de Montbui · Vallès</span>
          <span>Imprès: {new Date().toLocaleDateString('ca-ES')}</span>
          <span>{o.orderNumber}</span>
        </div>
      </div>
    </>
  )
}
