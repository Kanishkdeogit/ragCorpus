import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'

export async function POST() {
  try {
    await clearSessionCookie()
    return NextResponse.json({ success: true, message: 'Logged out successfully.' })
  } catch (err: any) {
    console.error('[Logout API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout.' },
      { status: 500 }
    )
  }
}
