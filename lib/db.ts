// Connexió a MongoDB Atlas amb singleton per a Next.js

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI ?? ''

// Caché de connexió per evitar múltiples connexions en dev (hot reload)
let cached = (global as any).mongoose as {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('Cal definir la variable MONGODB_URI al .env.local')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
