// Model Mongoose per a les comandes de Gorres PET

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { OrderStatus, ProductType, PackagingType, PaymentMethod, PaymentStatus, DeliveryType } from '@/types'

export interface IOrder extends Document {
  orderNumber: string
  status: OrderStatus
  client: {
    type: 'registered' | 'guest'
    userId: mongoose.Types.ObjectId | null
    name: string
    email: string
    phone: string
    company: string | null
  }
  items: Array<{
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
  }>
  pricing: {
    subtotal: number
    discount: number
    discountAmt: number
    urgency: boolean
    urgencyAmt: number
    shippingCost: number
    total: number
  }
  payment: {
    method: PaymentMethod
    status: PaymentStatus
    depositPaid: number
    depositDate: Date | null
    finalPaid: number
    finalDate: Date | null
  }
  delivery: {
    type: DeliveryType
    address: string | null
    city: string | null
    scheduledDate: Date | null
    deliveredDate: Date | null
    notes: string | null
  }
  production: {
    startDate: Date | null
    endDate: Date | null
    notes: string | null
    bottlesUsed: number
  }
  guestToken: string | null
  notes: string | null
  clientNotes: string | null
  createdAt: Date
  updatedAt: Date
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['NOVA_SOLICITUD', 'CONFIRMADA', 'EN_PRODUCCIO', 'PREPARADA', 'ENVIADA', 'COMPLETADA', 'CANCELLADA'],
      default: 'NOVA_SOLICITUD',
    },
    client: {
      type:    { type: String, enum: ['registered', 'guest'], required: true },
      userId:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name:    { type: String, required: true },
      email:   { type: String, required: true },
      phone:   { type: String, required: true },
      company: { type: String, default: null },
    },
    items: [
      {
        productType: { type: String, enum: ['basic', 'logo', 'color_logo', 'deluxe', 'souvenir'], required: true },
        quantity:    { type: Number, required: true, min: 10 },
        color:       { type: String, required: true, default: 'natural' },
        logo: {
          hasLogo:  { type: Boolean, default: false },
          size:     { type: String, enum: ['small', 'large', null], default: null },
          imageUrl: { type: String, default: null },
          notes:    { type: String, default: null },
        },
        packaging:  { type: String, enum: ['basic', 'deluxe', 'souvenir_box'], default: 'basic' },
        labelInner: { type: Boolean, default: false },
        unitPrice:  { type: Number, required: true },
        subtotal:   { type: Number, required: true },
      },
    ],
    pricing: {
      subtotal:     { type: Number, required: true },
      discount:     { type: Number, default: 0 },
      discountAmt:  { type: Number, default: 0 },
      urgency:      { type: Boolean, default: false },
      urgencyAmt:   { type: Number, default: 0 },
      shippingCost: { type: Number, default: 0 },
      total:        { type: Number, required: true },
    },
    payment: {
      method:      { type: String, enum: ['bizum', 'transfer', 'cash'], required: true },
      status:      { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
      depositPaid: { type: Number, default: 0 },
      depositDate: { type: Date, default: null },
      finalPaid:   { type: Number, default: 0 },
      finalDate:   { type: Date, default: null },
    },
    delivery: {
      type:          { type: String, enum: ['local', 'shipping'], required: true },
      address:       { type: String, default: null },
      city:          { type: String, default: null },
      scheduledDate: { type: Date, default: null },
      deliveredDate: { type: Date, default: null },
      notes:         { type: String, default: null },
    },
    production: {
      startDate:   { type: Date, default: null },
      endDate:     { type: Date, default: null },
      notes:       { type: String, default: null },
      bottlesUsed: { type: Number, default: 0 },
    },
    guestToken:  { type: String, default: null, index: true },
    notes:       { type: String, default: null },
    clientNotes: { type: String, default: null },
  },
  { timestamps: true }
)


const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)

export default Order
