// Tests de la lògica de preus — lib/pricing.ts
// Cobreix: calculateUnitPrice, calculateOrderPrice, getShippingCost, isShippingCustomQuote

import { strict as assert } from 'assert'
import {
  calculateUnitPrice,
  calculateOrderPrice,
  getShippingCost,
  isShippingCustomQuote,
  DEFAULT_PRICING,
} from '../lib/pricing'
import type { PricingConfigData } from '../types'

const cfg: PricingConfigData = DEFAULT_PRICING

// Helpers
const baseItem = (overrides = {}) => ({
  productType: 'basic' as const,
  color:       'natural',
  logo:        { hasLogo: false, size: null as null, imageUrl: null, notes: null },
  packaging:   'basic' as const,
  labelInner:  false,
  ...overrides,
})

// ---------------------------------------------------------------------------
describe('calculateUnitPrice', () => {

  it('basic natural sense extras = preu base', () => {
    assert.equal(calculateUnitPrice(baseItem(), cfg), 6)
  })

  it('basic amb color tenyit = base + 1.5', () => {
    assert.equal(calculateUnitPrice(baseItem({ color: 'blau' }), cfg), 7.5)
  })

  it('logo amb logo petit = preu logo base', () => {
    const item = baseItem({
      productType: 'logo',
      logo: { hasLogo: true, size: 'small', imageUrl: null, notes: null },
    })
    assert.equal(calculateUnitPrice(item, cfg), 11)
  })

  it('logo amb logo gran = base logo + 2', () => {
    const item = baseItem({
      productType: 'logo',
      logo: { hasLogo: true, size: 'large', imageUrl: null, notes: null },
    })
    assert.equal(calculateUnitPrice(item, cfg), 13)
  })

  it('deluxe NO suma packaging deluxe (ja inclòs al preu base)', () => {
    const item = baseItem({ productType: 'deluxe', packaging: 'deluxe' })
    assert.equal(calculateUnitPrice(item, cfg), 22)
  })

  it('souvenir NO suma packaging souvenir_box (ja inclòs)', () => {
    const item = baseItem({ productType: 'souvenir', packaging: 'souvenir_box' })
    assert.equal(calculateUnitPrice(item, cfg), 25)
  })

  it('basic amb packaging deluxe SÍ suma el sobrecost', () => {
    const item = baseItem({ packaging: 'deluxe' })
    assert.equal(calculateUnitPrice(item, cfg), 10) // 6 + 4
  })

  it('basic amb packaging souvenir_box SÍ suma el sobrecost', () => {
    const item = baseItem({ packaging: 'souvenir_box' })
    assert.equal(calculateUnitPrice(item, cfg), 12) // 6 + 6
  })

  it('etiqueta interior = base + 0.5', () => {
    const item = baseItem({ labelInner: true })
    assert.equal(calculateUnitPrice(item, cfg), 6.5)
  })

  it('combinació: color + logo gran + etiqueta interior', () => {
    const item = baseItem({
      productType: 'logo',
      color:       'vermell',
      logo:        { hasLogo: true, size: 'large', imageUrl: null, notes: null },
      labelInner:  true,
    })
    // 11 (logo) + 1.5 (color) + 2 (logo gran) + 0.5 (etiqueta) = 15
    assert.equal(calculateUnitPrice(item, cfg), 15)
  })
})

// ---------------------------------------------------------------------------
describe('calculateOrderPrice — descomptes per volum', () => {

  it('10 unitats sense descompte', () => {
    const items = [{ ...baseItem(), quantity: 10 }]
    const result = calculateOrderPrice(items, cfg, { urgent: false })
    assert.equal(result.subtotal, 60)
    assert.equal(result.discountPct, 0)
    assert.equal(result.discountAmt, 0)
    assert.equal(result.total, 60)
  })

  it('25 unitats → descompte 10%', () => {
    const items = [{ ...baseItem(), quantity: 25 }]
    const result = calculateOrderPrice(items, cfg, { urgent: false })
    assert.equal(result.subtotal, 150)
    assert.equal(result.discountPct, 0.10)
    assert.equal(result.discountAmt, 15)
    assert.equal(result.total, 135)
  })

  it('50 unitats → descompte 15%', () => {
    const items = [{ ...baseItem(), quantity: 50 }]
    const result = calculateOrderPrice(items, cfg, { urgent: false })
    assert.equal(result.subtotal, 300)
    assert.equal(result.discountPct, 0.15)
    assert.equal(result.total, 255)
  })

  it('100 unitats → descompte 20%', () => {
    const items = [{ ...baseItem(), quantity: 100 }]
    const result = calculateOrderPrice(items, cfg, { urgent: false })
    assert.equal(result.discountPct, 0.20)
    assert.equal(result.total, 480)
  })

  it('200 unitats → descompte 25%', () => {
    const items = [{ ...baseItem(), quantity: 200 }]
    const result = calculateOrderPrice(items, cfg, { urgent: false })
    assert.equal(result.discountPct, 0.25)
    assert.equal(result.total, 900)
  })

  it('2 items: quantitat total acumula per al descompte', () => {
    const items = [
      { ...baseItem(), quantity: 15 },
      { ...baseItem({ productType: 'logo' as const }), quantity: 15 },
    ]
    const result = calculateOrderPrice(items, cfg, { urgent: false })
    // 15×6 + 15×11 = 90 + 165 = 255 → 30 total → descompte 10%
    assert.equal(result.discountPct, 0.10)
    assert.equal(result.subtotal, 255)
    assert.equal(result.total, 229.5)
  })

  it('recàrrec urgència +20% sobre preu amb descompte', () => {
    const items = [{ ...baseItem(), quantity: 10 }]
    const result = calculateOrderPrice(items, cfg, { urgent: true })
    // 60 → sense descompte → urgència 60 * 0.2 = 12 → total 72
    assert.equal(result.urgencyAmt, 12)
    assert.equal(result.total, 72)
  })

  it('cost enviament s\'afegeix al total', () => {
    const items = [{ ...baseItem(), quantity: 10 }]
    const result = calculateOrderPrice(items, cfg, { urgent: false, shippingCost: 8 })
    assert.equal(result.shippingCost, 8)
    assert.equal(result.total, 68)
  })
})

// ---------------------------------------------------------------------------
describe('getShippingCost', () => {

  it('lliurament local → sempre 0', () => {
    assert.equal(getShippingCost('local',     'local',    10),  0)
    assert.equal(getShippingCost('catalunya', 'local',    100), 0)
    assert.equal(getShippingCost(null,        'local',    50),  0)
  })

  it('zona local (factor 0.8) — 10 gorres = 1 caixa → base 10 × 0.8 = 8', () => {
    assert.equal(getShippingCost('local', 'shipping', 10), 8)
  })

  it('zona local — 50 gorres = 5 caixes → base 10 × 0.8 = 8', () => {
    assert.equal(getShippingCost('local', 'shipping', 50), 8)
  })

  it('zona local — 60 gorres = 6 caixes → base 20 × 0.8 = 16', () => {
    assert.equal(getShippingCost('local', 'shipping', 60), 16)
  })

  it('zona catalunya (factor 1.0) — 10 gorres → base 10 × 1.0 = 10', () => {
    assert.equal(getShippingCost('catalunya', 'shipping', 10), 10)
  })

  it('zona espanya (factor 1.3) — 10 gorres → base 10 × 1.3 = 13', () => {
    assert.equal(getShippingCost('espanya', 'shipping', 10), 13)
  })

  it('zona espanya — 200 gorres = 20 caixes → base 20 × 1.3 = 26', () => {
    assert.equal(getShippingCost('espanya', 'shipping', 200), 26)
  })

  it('zona espanya — 400 gorres = 40 caixes (llindar) → base 50 × 1.3 = 65', () => {
    assert.equal(getShippingCost('espanya', 'shipping', 400), 65)
  })

  it('>400 gorres = pressupost personalitzat → retorna 0', () => {
    assert.equal(getShippingCost('espanya', 'shipping', 401), 0)
  })

  it('zona desconeguda usa factor 1.0 per defecte', () => {
    assert.equal(getShippingCost('america', 'shipping', 10), 10)
  })
})

// ---------------------------------------------------------------------------
describe('isShippingCustomQuote', () => {

  it('lliurament local → mai pressupost personalitzat', () => {
    assert.equal(isShippingCustomQuote(1000, 'local'), false)
  })

  it('400 gorres → NO és personalitzat (exactament al llindar)', () => {
    assert.equal(isShippingCustomQuote(400, 'shipping'), false)
  })

  it('401 gorres → SÍ és personalitzat', () => {
    assert.equal(isShippingCustomQuote(401, 'shipping'), true)
  })

  it('1000 gorres → SÍ és personalitzat', () => {
    assert.equal(isShippingCustomQuote(1000, 'shipping'), true)
  })
})
