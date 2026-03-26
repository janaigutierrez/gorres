// Enviament d'emails transaccionals via Resend
// Requereix: RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL, ADMIN_EMAIL

import { Resend } from 'resend'
import { PRODUCT_NAMES } from '@/lib/pricing'

const resend    = new Resend(process.env.RESEND_API_KEY)
const FROM      = process.env.EMAIL_FROM        ?? 'Gorres PET <onboarding@resend.dev>'
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// --- Layout base ---
function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:15px;font-weight:700;color:#15803d;letter-spacing:-0.3px;">🧢 Gorres PET</span>
    </div>
    <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:32px;">
      ${content}
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;margin-bottom:0;">
      Gorres PET · gorrespet.cat
    </p>
  </div>
</body>
</html>`
}

function itemsList(items: Array<{ productType: string; quantity: number }>): string {
  return items.map(i =>
    `<li style="margin-bottom:4px;">${i.quantity}× ${PRODUCT_NAMES[i.productType] ?? i.productType}</li>`
  ).join('')
}

// --- 1. Client: nova sol·licitud rebuda ---
export async function sendNewOrderToClient({
  to, orderNumber, clientName, trackingToken, total, items, deliveryDate, paymentMethod,
}: {
  to: string
  orderNumber: string
  clientName: string
  trackingToken: string
  total: number
  items: Array<{ productType: string; quantity: number }>
  deliveryDate: Date
  paymentMethod: string
}) {
  if (!process.env.RESEND_API_KEY) return
  const trackingUrl  = `${APP_URL}/seguiment/${trackingToken}`
  const depositAmt   = (total * 0.5).toFixed(2)
  const methodLabels: Record<string, string> = { bizum: 'Bizum', transfer: 'Transferència', cash: 'Efectiu' }

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Sol·licitud rebuda — ${orderNumber}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0;">Sol·licitud rebuda!</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">
        Hola ${clientName}, hem rebut la teva sol·licitud. La revisarem i et confirmarem en breu.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.7;">
          <strong>Número de comanda:</strong> ${orderNumber}<br>
          <strong>Total:</strong> ${total.toFixed(2)}€<br>
          <strong>Bestreta (50%):</strong> ${depositAmt}€ per ${methodLabels[paymentMethod] ?? paymentMethod}<br>
          <strong>Data estimada:</strong> ${deliveryDate.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <p style="font-size:14px;color:#374151;font-weight:600;margin:0 0 8px 0;">Productes:</p>
      <ul style="font-size:14px;color:#374151;padding-left:20px;margin:0 0 24px 0;">
        ${itemsList(items)}
      </ul>

      <p style="font-size:14px;color:#374151;margin:0 0 24px 0;">
        Un cop confirmada la comanda, t'indicarem com fer la bestreta per iniciar la producció.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${trackingUrl}"
          style="background:#15803d;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Seguir la meva comanda →
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        Tens dubtes? <a href="mailto:comandes@gorrespet.cat" style="color:#15803d;">comandes@gorrespet.cat</a>
      </p>
    `),
  })
}

// --- 2. Admin: nova sol·licitud entrant ---
export async function sendNewOrderToAdmin({
  orderNumber, clientName, clientEmail, clientPhone, total, items, orderId,
}: {
  orderNumber: string
  clientName: string
  clientEmail: string
  clientPhone: string
  total: number
  items: Array<{ productType: string; quantity: number }>
  orderId: string
}) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!process.env.RESEND_API_KEY || !adminEmail) return

  const adminUrl = `${APP_URL}/admin/comandes/${orderId}`

  await resend.emails.send({
    from:    FROM,
    to:      adminEmail,
    subject: `[NOVA] ${orderNumber} — ${clientName}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 4px 0;">Nova sol·licitud</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">${orderNumber}</p>

      <div style="margin-bottom:20px;">
        <p style="font-size:14px;color:#374151;margin:0 0 5px 0;"><strong>Client:</strong> ${clientName}</p>
        <p style="font-size:14px;color:#374151;margin:0 0 5px 0;"><strong>Email:</strong> ${clientEmail}</p>
        <p style="font-size:14px;color:#374151;margin:0 0 5px 0;"><strong>Telèfon:</strong> ${clientPhone}</p>
        <p style="font-size:14px;color:#374151;margin:0;"><strong>Total:</strong> ${total.toFixed(2)}€</p>
      </div>

      <p style="font-size:14px;color:#374151;font-weight:600;margin:0 0 8px 0;">Productes:</p>
      <ul style="font-size:14px;color:#374151;padding-left:20px;margin:0 0 24px 0;">
        ${itemsList(items)}
      </ul>

      <div style="text-align:center;">
        <a href="${adminUrl}"
          style="background:#15803d;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Gestionar comanda →
        </a>
      </div>
    `),
  })
}

// --- 3. Client: producció iniciada ---
export async function sendOrderInProductionToClient({
  to, orderNumber, clientName, trackingToken, deliveryDate,
}: {
  to: string
  orderNumber: string
  clientName: string
  trackingToken: string
  deliveryDate: Date | null
}) {
  if (!process.env.RESEND_API_KEY) return
  const trackingUrl = `${APP_URL}/seguiment/${trackingToken}`

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `En producció — ${orderNumber}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0;">Les teves gorres s'estan fabricant 🧢</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">
        Hola ${clientName}, la comanda <strong>${orderNumber}</strong> ha entrat en producció.
        En breu les teves gorres estaran llestes.
      </p>

      ${deliveryDate ? `
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#92400e;">
          📅 <strong>Data estimada de lliurament:</strong>
          ${deliveryDate.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>` : ''}

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${trackingUrl}"
          style="background:#15803d;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Seguir la meva comanda →
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        Tens dubtes? <a href="mailto:comandes@gorrespet.cat" style="color:#15803d;">comandes@gorrespet.cat</a>
      </p>
    `),
  })
}

// --- 4. Client: comanda preparada/llesta ---
export async function sendOrderReadyToClient({
  to, orderNumber, clientName, trackingToken, deliveryType, scheduledDate,
}: {
  to: string
  orderNumber: string
  clientName: string
  trackingToken: string
  deliveryType: string
  scheduledDate: Date | null
}) {
  if (!process.env.RESEND_API_KEY) return
  const trackingUrl = `${APP_URL}/seguiment/${trackingToken}`
  const isShipping  = deliveryType === 'shipping'

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Comanda llesta — ${orderNumber}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0;">Les teves gorres estan llestes! 🎉</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">
        Hola ${clientName}, la comanda <strong>${orderNumber}</strong> ja està preparada.
      </p>

      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#5b21b6;font-weight:600;margin-bottom:6px;">
          ${isShipping ? '📦 Enviament en preparació' : '📍 Recollida local'}
        </p>
        <p style="margin:0;font-size:14px;color:#5b21b6;">
          ${isShipping
            ? 'Aviat rebràs les gorres a l\'adreça indicada. Et contactarem per confirmar l\'enviament.'
            : scheduledDate
              ? `Pots passar a recollir-les a partir del ${scheduledDate.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })}.`
              : 'Et contactarem per acordar el dia de recollida.'
          }
        </p>
      </div>

      <p style="font-size:14px;color:#374151;margin:0 0 24px 0;">
        Recorda que cal tenir el pagament complet abans de l&apos;entrega.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${trackingUrl}"
          style="background:#15803d;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Veure la meva comanda →
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        Tens dubtes? <a href="mailto:comandes@gorrespet.cat" style="color:#15803d;">comandes@gorrespet.cat</a>
      </p>
    `),
  })
}

// --- 5. Client: comanda enviada (paquet en ruta) ---
export async function sendOrderShippedToClient({
  to, orderNumber, clientName, trackingToken, deliveryAddress,
}: {
  to: string
  orderNumber: string
  clientName: string
  trackingToken: string
  deliveryAddress: string | null
}) {
  if (!process.env.RESEND_API_KEY) return
  const trackingUrl = `${APP_URL}/seguiment/${trackingToken}`

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Paquet enviat — ${orderNumber}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0;">El teu paquet està en camí! 📦</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">
        Hola ${clientName}, la comanda <strong>${orderNumber}</strong> ha estat enviada.
      </p>

      ${deliveryAddress ? `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#0369a1;">
          📍 <strong>Adreça d'entrega:</strong> ${deliveryAddress}
        </p>
      </div>` : ''}

      <p style="font-size:14px;color:#374151;margin:0 0 24px 0;">
        Rebràs el paquet en els propers dies. Si tens qualsevol incidència amb l'enviament, contacta'ns i ho gestionem.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${trackingUrl}"
          style="background:#0284c7;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Veure la meva comanda →
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        Tens dubtes? <a href="mailto:comandes@gorrespet.cat" style="color:#0284c7;">comandes@gorrespet.cat</a>
      </p>
    `),
  })
}

// --- 6. Client: comanda completada/entregada ---
export async function sendOrderCompletedToClient({
  to, orderNumber, clientName, trackingToken, total,
}: {
  to: string
  orderNumber: string
  clientName: string
  trackingToken: string
  total: number
}) {
  if (!process.env.RESEND_API_KEY) return
  const trackingUrl = `${APP_URL}/seguiment/${trackingToken}`

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Comanda entregada — ${orderNumber}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0;">Comanda entregada ✅</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">
        Hola ${clientName}, la teva comanda <strong>${orderNumber}</strong> ha estat entregada. Gràcies per confiar en Gorres PET!
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#166534;">
          <strong>Total de la comanda:</strong> ${total.toFixed(2)}€<br>
          <strong>Estat del pagament:</strong> Completat
        </p>
      </div>

      <p style="font-size:14px;color:#374151;margin:0 0 24px 0;">
        Esperem que les gorres siguin del teu gust. Si tens qualsevol comentari o incidència, no dubtis en contactar-nos.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${trackingUrl}"
          style="background:#15803d;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Veure el resum de la comanda →
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        Gorres PET · <a href="mailto:comandes@gorrespet.cat" style="color:#15803d;">comandes@gorrespet.cat</a>
      </p>
    `),
  })
}

// --- 6. Client: comanda confirmada ---
export async function sendOrderConfirmedToClient({
  to, orderNumber, clientName, total, trackingToken, paymentMethod, deliveryDate,
}: {
  to: string
  orderNumber: string
  clientName: string
  total: number
  trackingToken: string
  paymentMethod: string
  deliveryDate: Date | null
}) {
  if (!process.env.RESEND_API_KEY) return
  const trackingUrl = `${APP_URL}/seguiment/${trackingToken}`
  const depositAmt  = (total * 0.5).toFixed(2)

  const paymentInstructions: Record<string, string> = {
    bizum:    `Envia <strong>${depositAmt}€</strong> per Bizum al número que t'indicarem per email.`,
    transfer: `Transfereix <strong>${depositAmt}€</strong> al compte que t'indicarem per email.`,
    cash:     `Prepara <strong>${depositAmt}€</strong> en efectiu per a la recollida.`,
  }

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Comanda confirmada — ${orderNumber}`,
    html: layout(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0;">Comanda confirmada ✅</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;">
        Hola ${clientName}, la teva comanda <strong>${orderNumber}</strong> ha estat confirmada
        i entrarà aviat en producció.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px 0;font-size:14px;color:#166534;font-weight:600;">Propera acció: bestreta del 50%</p>
        <p style="margin:0;font-size:14px;color:#166534;">
          ${paymentInstructions[paymentMethod] ?? `Contacta'ns per confirmar el pagament de ${depositAmt}€.`}
        </p>
        <p style="margin:6px 0 0 0;font-size:13px;color:#166534;">
          Posa el concepte <strong>${orderNumber}</strong> al pagament.
        </p>
      </div>

      ${deliveryDate ? `
      <p style="font-size:14px;color:#374151;margin:0 0 24px 0;">
        📅 <strong>Data estimada de lliurament:</strong>
        ${deliveryDate.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>` : ''}

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${trackingUrl}"
          style="background:#15803d;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          Veure la meva comanda →
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        Tens dubtes? <a href="mailto:comandes@gorrespet.cat" style="color:#15803d;">comandes@gorrespet.cat</a>
      </p>
    `),
  })
}
