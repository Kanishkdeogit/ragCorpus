import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { getSessionUser } from '@/lib/auth/session'
import { vectorStore } from '@/lib/vector/qdrant'
import { executeRAG } from '@/lib/ai/groq'
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'

// GET: Retrieve past chat history for user
export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 100',
      args: [sessionUser.id],
    })

    const messages = result.rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      citations: row.citations ? JSON.parse(row.citations as string) : undefined,
      addedAt: row.created_at,
    }))

    return NextResponse.json(messages)
  } catch (err: any) {
    console.error('[Get Chat History API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

// POST: Run user question through vector retrieval + LLM / local RAG
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { question } = await req.json()
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 })
    }

    const db = getDb()

    // 1. Search vector database for top matching passages in user's documents
    const matchedChunks = await vectorStore.searchSimilarChunks(sessionUser.id, question.trim(), 5)

    // 2. Query Groq / Local Mock summarizing context
    const { answer, citations } = await executeRAG(sessionUser.id, question.trim(), matchedChunks)

    // 3. Log user & assistant messages in Turso
    const userMsgId = crypto.randomUUID()
    const assistantMsgId = crypto.randomUUID()

    // Log User Message
    await db.execute({
      sql: 'INSERT INTO chat_messages (id, user_id, role, content, citations) VALUES (?, ?, ?, ?, NULL)',
      args: [userMsgId, sessionUser.id, 'user', question.trim()],
    })

    // Log Assistant Message
    await db.execute({
      sql: 'INSERT INTO chat_messages (id, user_id, role, content, citations) VALUES (?, ?, ?, ?, ?)',
      args: [assistantMsgId, sessionUser.id, 'assistant', answer, JSON.stringify(citations)],
    })

    // Return the response object structured for ChatMessage frontend integration
    return NextResponse.json({
      id: assistantMsgId,
      role: 'assistant',
      content: answer,
      citations,
    })
  } catch (err: any) {
    console.error('[Chat RAG API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during RAG operation.' },
      { status: 500 }
    )
  }
}
