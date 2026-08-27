import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { getSessionUser, hashPassword } from '@/lib/auth/session'
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'

// READ: List all users
export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const result = await db.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC')
    
    return NextResponse.json(result.rows)
  } catch (err: any) {
    console.error('[Get Users API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

// CREATE: Add a new user (with role specification)
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, password, role } = await req.json()

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

    // Check if user exists
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

    const newUserId = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    const finalRole = role === 'admin' ? 'admin' : 'user'

    await db.execute({
      sql: 'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      args: [newUserId, name, email.toLowerCase(), passwordHash, finalRole],
    })

    return NextResponse.json({
      id: newUserId,
      name,
      email: email.toLowerCase(),
      role: finalRole,
    })
  } catch (err: any) {
    console.error('[Create User API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
