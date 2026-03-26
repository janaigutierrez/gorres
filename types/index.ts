// Tipus globals de Gorres PET

export type OrderStatus =
  | 'NOVA_SOLICITUD'
  | 'CONFIRMADA'
  | 'EN_PRODUCCIO'
  | 'PREPARADA'
  | 'ENVIADA'
  | 'COMPLETADA'
  | 'CANCELLADA'

export type ProductType = 'basic' | 'logo' | 'color_logo' | 'deluxe' | 'souvenir'

export type PackagingType = 'basic' | 'deluxe' | 'souvenir_box'

export type PaymentMethod = 'bizum' | 'transfer' | 'cash'

export type PaymentStatus = 'pending' | 'partial' | 'paid'

export type DeliveryType = 'local' | 'shipping'

export type UserRole = 'admin' | 'operator'

export type StockType = 'blank_hat' | 'pet_bottles' | 'yarn' | 'packaging'

export type StockUnit = 'units' | 'kg' | 'bottles'

export type StockMovementType = 'in' | 'out' | 'adjustment'

// Item dins d'una comanda
export interface OrderItem {
  productType: ProductType
  quantity: number
  color: string
  logo: {
    hasLogo: boolean
    size: 'small' | 'large' | null
    imageUrl: string | null
    notes: string | null
  }
  packaging: PackagingType
  labelInner: boolean
  unitPrice: number
  subtotal: number
}

// Resultat del càlcul de preus
export interface PricingResult {
  subtotal: number
  discountPct: number
  discountAmt: number
  urgencyAmt: number
  shippingCost: number
  total: number
}

// Config de preus (format pla per a la lògica)
export interface PricingConfigData {
  products: {
    basic: { basePrice: number }
    logo: { basePrice: number }
    color_logo: { basePrice: number }
    deluxe: { basePrice: number }
    souvenir: { basePrice: number }
  }
  extras: {
    color: { price: number }
    logoLarge: { price: number }
    packagingDeluxe: { price: number }
    packagingSouvenir: { price: number }
    urgency: { multiplier: number }
    labelInner: { price: number }
  }
  volumeDiscounts: Array<{
    minQty: number
    maxQty: number
    discount: number
  }>
  productionDays: {
    standard: number
    urgent: number
  }
}
