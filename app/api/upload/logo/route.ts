// API: POST /api/upload/logo
// Rep un fitxer d'imatge, el puja a Cloudinary i retorna la URL segura.

import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
})

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED   = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']

export async function POST(req: Request) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: 'Cloudinary no configurat' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Error llegint el formulari' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Cap fitxer rebut' }, { status: 400 })
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Format no acceptat. Usa PNG, JPG o SVG.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El fitxer supera 5 MB' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:          'gorres-pet/logos',
      resource_type:   'image',
      allowed_formats: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
      transformation:  [{ width: 1200, crop: 'limit' }],
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error('[upload/logo]', err)
    return NextResponse.json({ error: 'Error pujant a Cloudinary' }, { status: 500 })
  }
}
