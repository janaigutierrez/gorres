// Models Mongoose per a l'estoc i el seu historial de moviments

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { StockType, StockUnit, StockMovementType } from '@/types'

// --- Stock item ---

export interface IStock extends Document {
  type: StockType
  name: string
  quantity: number
  unit: StockUnit
  minAlert: number
  color: string | null
  notes: string | null
  updatedAt: Date
}

const StockSchema = new Schema<IStock>(
  {
    type:      { type: String, enum: ['blank_hat', 'pet_bottles', 'yarn', 'packaging'], required: true },
    name:      { type: String, required: true },
    quantity:  { type: Number, required: true, default: 0 },
    unit:      { type: String, enum: ['units', 'kg', 'bottles'], required: true },
    minAlert:  { type: Number, required: true, default: 0 },
    color:     { type: String, default: null },
    notes:     { type: String, default: null },
  },
  { timestamps: true }
)

export const Stock: Model<IStock> =
  mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema)

// --- Stock movement (historial) ---

export interface IStockMovement extends Document {
  stockId: mongoose.Types.ObjectId
  type: StockMovementType
  quantity: number
  reason: string
  orderId: mongoose.Types.ObjectId | null
  date: Date
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    stockId:  { type: Schema.Types.ObjectId, ref: 'Stock', required: true },
    type:     { type: String, enum: ['in', 'out', 'adjustment'], required: true },
    quantity: { type: Number, required: true },
    reason:   { type: String, required: true },
    orderId:  { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    date:     { type: Date, default: Date.now },
  }
)

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema)
