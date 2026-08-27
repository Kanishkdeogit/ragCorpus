import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { hashPassword, createSessionCookie } from '@/lib/auth/session'
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if user already exists
    const checkUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ? LIMIT 1',
      args: [email.toLowerCase()],
    })

    if (checkUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const userId = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    const role = 'user'

    // Insert user
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      args: [userId, name, email.toLowerCase(), passwordHash, role],
    })

    const sessionPayload = {
      id: userId,
      email: email.toLowerCase(),
      name,
      role,
    }

    // Set cookie
    await createSessionCookie(sessionPayload)

    return NextResponse.json({
      id: userId,
      name,
      email: email.toLowerCase(),
      role,
    })
  } catch (err: any) {
    console.error('[Register API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    )
  }
}
