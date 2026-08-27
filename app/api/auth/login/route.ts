import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { comparePassword, createSessionCookie } from '@/lib/auth/session'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Fetch user
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ? LIMIT 1',
      args: [email.toLowerCase()],
    })

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    const user = result.rows[0]
    const passwordHash = user.password_hash as string

    const isMatch = await comparePassword(password, passwordHash)
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    const sessionPayload = {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
    }

    // Set cookie
    await createSessionCookie(sessionPayload)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (err: any) {
    console.error('[Login API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    )
  }
}
