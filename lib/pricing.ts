// Lògica de càlcul de preus centralitzada
// Usada tant pel frontend (preview temps real) com pel backend (càlcul definitiu)
// IMPORTANT: Mai confiar en el preu enviat pel client — recalcular sempre al servidor

import type { OrderItem, PricingConfigData, PricingResult } from '@/types'

// Zones d'enviament — 3 zones amb multiplicador (PDR)
export const SHIPPING_ZONES = [
  { id: 'local',     label: 'Local (Caldes / Vallès)', factor: 0.8 },
  { id: 'catalunya', label: 'Catalunya',                factor: 1.0 },
  { id: 'espanya',   label: "Resta d'Espanya",          factor: 1.3 },
]

// Llindar de pressupost personalitzat: >40 caixes (>400 unitats)
const CUSTOM_QUOTE_BOXES = 40

function shippingBasePrice(totalQty: number): number | null {
  const boxes = Math.ceil(totalQty / 10)
  if (boxes <= 5)              return 10
  if (boxes <= 20)             return 20
  if (boxes <= CUSTOM_QUOTE_BOXES) return 50
  return null // pressupost personalitzat
}

export function getShippingCost(
  zoneId:       string | null | undefined,
  deliveryType: string,
  totalQty:     number = 0,
): number {
  if (deliveryType !== 'shipping') return 0
  const base = shippingBasePrice(totalQty)
  if (base === null) return 0
  const factor = SHIPPING_ZONES.find(z => z.id === zoneId)?.factor ?? 1.0
  return Math.round(base * factor * 100) / 100
}

export function isShippingCustomQuote(totalQty: number, deliveryType: string): boolean {
  return deliveryType === 'shipping' && Math.ceil(totalQty / 10) > CUSTOM_QUOTE_BOXES
}

// Configuració de preus per defecte (s'usa si no hi ha BD disponible)
export const DEFAULT_PRICING: PricingConfigData = {
  products: {
    basic:      { basePrice: 6 },
    logo:       { basePrice: 11 },
    color_logo: { basePrice: 13 },
    deluxe:     { basePrice: 22 },
    souvenir:   { basePrice: 25 },
  },
  extras: {
    color:              { price: 1.5 },
    logoLarge:          { price: 2.0 },
    packagingDeluxe:    { price: 4.0 },
    packagingSouvenir:  { price: 6.0 },
    urgency:            { multiplier: 1.20 },
    labelInner:         { price: 0.5 },
  },
  volumeDiscounts: [
    { minQty: 25,  maxQty: 49,  discount: 0.10 },
    { minQty: 50,  maxQty: 99,  discount: 0.15 },
    { minQty: 100, maxQty: 199, discount: 0.20 },
    { minQty: 200, maxQty: 999, discount: 0.25 },
  ],
  productionDays: {
    standard: 21,
    urgent:   7,
  },
}

// Calcula el preu unitari d'un item sense tenir en compte descomptes de volum
export function calculateUnitPrice(
  item: Pick<OrderItem, 'productType' | 'color' | 'logo' | 'packaging' | 'labelInner'>,
  config: PricingConfigData
): number {
  let unitPrice = config.products[item.productType].basePrice

  // Color tenyit (no natural)
  if (item.color !== 'natural') {
    unitPrice += config.extras.color.price
  }

  // Logo gran
  if (item.logo.hasLogo && item.logo.size === 'large') {
    unitPrice += config.extras.logoLarge.price
  }

  // Packaging especial — el deluxe i souvenir ja porten el packaging inclòs al preu base
  const packagingInclosBProducte: Record<string, string> = {
    deluxe:   'deluxe',
    souvenir: 'souvenir_box',
  }
  const packagingJaInclos = packagingInclosBProducte[item.productType] === item.packaging
  if (!packagingJaInclos) {
    if (item.packaging === 'deluxe') {
      unitPrice += config.extras.packagingDeluxe.price
    } else if (item.packaging === 'souvenir_box') {
      unitPrice += config.extras.packagingSouvenir.price
    }
  }

  // Etiqueta interior
  if (item.labelInner) {
    unitPrice += config.extras.labelInner.price
  }

  return unitPrice
}

// Calcula el preu total de la comanda completa
export function calculateOrderPrice(
  items: Array<Pick<OrderItem, 'productType' | 'quantity' | 'color' | 'logo' | 'packaging' | 'labelInner'>>,
  config: PricingConfigData,
  options: { urgent: boolean; shippingCost?: number }
): PricingResult {
  let subtotal = 0

  for (const item of items) {
    const unitPrice = calculateUnitPrice(item, config)
    subtotal += unitPrice * item.quantity
  }

  // Descompte per volum (aplica sobre quantitat total de tots els items)
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
  const discountTier = config.volumeDiscounts.find(
    (d) => totalQty >= d.minQty && totalQty <= d.maxQty
  )
  const discountPct = discountTier?.discount ?? 0
  const discountAmt = subtotal * discountPct

  // Urgència: s'aplica sobre el preu amb descompte
  const afterDiscount = subtotal - discountAmt
  const urgencyAmt = options.urgent
    ? afterDiscount * (config.extras.urgency.multiplier - 1)
    : 0

  const shippingCost = options.shippingCost ?? 0
  const total = afterDiscount + urgencyAmt + shippingCost

  return {
    subtotal:     Math.round(subtotal * 100) / 100,
    discountPct,
    discountAmt:  Math.round(discountAmt * 100) / 100,
    urgencyAmt:   Math.round(urgencyAmt * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    total:        Math.round(total * 100) / 100,
  }
}

// Calcula la data estimada de lliurament
export function calculateDeliveryDate(
  config: PricingConfigData,
  urgent: boolean
): Date {
  const days = urgent ? config.productionDays.urgent : config.productionDays.standard
  const date = new Date()
  let added = 0

  while (added < days) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    // Saltar dissabtes (6) i diumenges (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }

  return date
}

// Noms llegibles dels productes
export const PRODUCT_NAMES: Record<string, string> = {
  basic:      'Gorra Bàsica',
  logo:       'Gorra amb Logo',
  color_logo: 'Gorra Color + Logo',
  deluxe:     'Gorra Deluxe',
  souvenir:   'Gorra Souvenir',
}

// Colors disponibles de fil
export const AVAILABLE_COLORS = [
  { id: 'natural',  name: 'Natural',  hex: '#D4C4A8' },
  { id: 'blau',     name: 'Blau',     hex: '#2E5FAA' },
  { id: 'vermell',  name: 'Vermell',  hex: '#C0392B' },
  { id: 'verd',     name: 'Verd',     hex: '#27AE60' },
  { id: 'negre',    name: 'Negre',    hex: '#2C3E50' },
  { id: 'gris',     name: 'Gris',     hex: '#7F8C8D' },
  { id: 'groc',     name: 'Groc',     hex: '#F39C12' },
  { id: 'taronja',  name: 'Taronja',  hex: '#E67E22' },
  { id: 'rosa',     name: 'Rosa',     hex: '#E91E8C' },
  { id: 'morat',    name: 'Morat',    hex: '#8E44AD' },
]
