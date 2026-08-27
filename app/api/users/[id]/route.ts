import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { getSessionUser, hashPassword, createSessionCookie, clearSessionCookie } from '@/lib/auth/session'

// GET: Read user by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      args: [id],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (err: any) {
    console.error('[Get User Detail API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

// UPDATE: Modify user details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check: User can update themselves, or Admin can update anyone
    if (sessionUser.id !== id && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, email, password, role } = await req.json()
    const db = getDb()

    // Retrieve existing user
    const checkUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
      args: [id],
    })

    if (checkUser.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentUser = checkUser.rows[0]

    let finalName = name || (currentUser.name as string)
    let finalEmail = email ? email.toLowerCase() : (currentUser.email as string)
    let finalRole = role || (currentUser.role as string)
    let finalHash = currentUser.password_hash as string

    if (password && password.trim().length >= 8) {
      finalHash = await hashPassword(password)
    }

    // Update DB
    await db.execute({
      sql: `UPDATE users 
            SET name = ?, email = ?, password_hash = ?, role = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [finalName, finalEmail, finalHash, finalRole, id],
    })

    // If updating own profile, update active session cookie
    if (sessionUser.id === id) {
      await createSessionCookie({
        id,
        email: finalEmail,
        name: finalName,
        role: finalRole,
      })
    }

    return NextResponse.json({
      id,
      name: finalName,
      email: finalEmail,
      role: finalRole,
    })
  } catch (err: any) {
    console.error('[Update User API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during user update.' },
      { status: 500 }
    )
  }
}

// DELETE: Delete user account
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check: User can delete themselves, or Admin can delete anyone
    if (sessionUser.id !== id && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()

    // Delete user (cascade will handle sessions, documents, chat messages in Turso SQLite)
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id],
    })

    // If current session user is deleted, clear cookie
    if (sessionUser.id === id) {
      await clearSessionCookie()
    }

    return NextResponse.json({ success: true, message: 'User account deleted.' })
  } catch (err: any) {
    console.error('[Delete User API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during user deletion.' },
      { status: 500 }
    )
  }
}
