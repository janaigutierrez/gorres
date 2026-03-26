// Model Mongoose per als usuaris (admin i operari)

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { UserRole } from '@/types'

export interface IUser extends Document {
  role: UserRole
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  city: string | null
  passwordHash: string | null
  totalOrders: number
  totalSpent: number
  notes: string | null
  createdAt: Date
  lastOrderAt: Date | null
}

const UserSchema = new Schema<IUser>(
  {
    role:         { type: String, enum: ['admin', 'operator'], required: true },
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true },
    phone:        { type: String, default: null },
    company:      { type: String, default: null },
    address:      { type: String, default: null },
    city:         { type: String, default: null },
    passwordHash: { type: String, default: null },
    totalOrders:  { type: Number, default: 0 },
    totalSpent:   { type: Number, default: 0 },
    notes:        { type: String, default: null },
    lastOrderAt:  { type: Date, default: null },
  },
  { timestamps: true }
)

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
