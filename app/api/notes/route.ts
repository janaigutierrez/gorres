// API: GET/POST/DELETE /api/notes — Notes ràpides del dashboard

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import mongoose, { Schema, Model, Document } from 'mongoose'

interface INote extends Document {
  text: string
  createdAt: Date
}

const NoteSchema = new Schema<INote>({ text: String }, { timestamps: true })

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema)

export async function GET() {
  await connectDB()
  const notes = await Note.find().sort({ createdAt: -1 }).limit(20).lean()
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Buit' }, { status: 400 })
  await connectDB()
  const note = await Note.create({ text: text.trim() })
  return NextResponse.json(note, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await connectDB()
  await Note.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
