import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { getSessionUser } from '@/lib/auth/session'
import { vectorStore } from '@/lib/vector/qdrant'

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

    const db = getDb()

    // Retrieve document to verify ownership
    const docResult = await db.execute({
      sql: 'SELECT id, user_id FROM documents WHERE id = ? LIMIT 1',
      args: [id],
    })

    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const document = docResult.rows[0]
    if (document.user_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete vectors from Qdrant
    await vectorStore.deleteDocumentChunks(sessionUser.id, id)

    // Delete document row from database
    await db.execute({
      sql: 'DELETE FROM documents WHERE id = ?',
      args: [id],
    })

    return NextResponse.json({ success: true, message: 'Document and vectors deleted.' })
  } catch (err: any) {
    console.error('[Delete Document API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
