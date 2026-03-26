// Model Mongoose per a la configuració de preus (1 sol document, editable des de l'admin)

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { PricingConfigData } from '@/types'

export interface IPricingConfig extends Document, PricingConfigData {
  updatedAt: Date
}

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    products: {
      basic:      { basePrice: { type: Number, default: 6 } },
      logo:       { basePrice: { type: Number, default: 11 } },
      color_logo: { basePrice: { type: Number, default: 13 } },
      deluxe:     { basePrice: { type: Number, default: 22 } },
      souvenir:   { basePrice: { type: Number, default: 25 } },
    },
    extras: {
      color:             { price: { type: Number, default: 1.5 } },
      logoLarge:         { price: { type: Number, default: 2.0 } },
      packagingDeluxe:   { price: { type: Number, default: 4.0 } },
      packagingSouvenir: { price: { type: Number, default: 6.0 } },
      urgency:           { multiplier: { type: Number, default: 1.20 } },
      labelInner:        { price: { type: Number, default: 0.5 } },
    },
    volumeDiscounts: [
      {
        minQty:   { type: Number, required: true },
        maxQty:   { type: Number, required: true },
        discount: { type: Number, required: true },
      },
    ],
    productionDays: {
      standard: { type: Number, default: 21 },
      urgent:   { type: Number, default: 7 },
    },
  },
  { timestamps: true }
)

export const PricingConfig: Model<IPricingConfig> =
  mongoose.models.PricingConfig ||
  mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema)

// Retorna la config activa (o la per defecte si no n'hi ha)
export async function getActivePricingConfig(): Promise<PricingConfigData> {
  const { connectDB } = await import('@/lib/db')
  const { DEFAULT_PRICING } = await import('@/lib/pricing')
  await connectDB()
  const config = await PricingConfig.findOne().lean()
  return (config as PricingConfigData | null) ?? DEFAULT_PRICING
}
