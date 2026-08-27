import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/turso'
import { getSessionUser } from '@/lib/auth/session'
import { vectorStore } from '@/lib/vector/qdrant'
import { PDFParse } from 'pdf-parse'
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'

export const maxDuration = 60 // Allow 60s for large files parsing

// Helper to format bytes
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// GET: Fetch user's documents
export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
      args: [sessionUser.id],
    })

    // Map database properties to frontend type
    const docs = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sizeLabel: row.size_label,
      pages: row.pages,
      chunks: row.chunks,
      status: row.status,
      addedAt: new Date(row.created_at as string).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }))

    return NextResponse.json(docs)
  } catch (err: any) {
    console.error('[Get Documents API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

// POST: Upload, parse PDF, chunk, vector index
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF documents are supported.' }, { status: 400 })
    }

    const docId = crypto.randomUUID()
    const docName = file.name
    const sizeLabel = formatBytes(file.size)

    const db = getDb()

    // Insert doc in indexing status first
    await db.execute({
      sql: `INSERT INTO documents (id, user_id, name, size_label, pages, chunks, status, qdrant_collection)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [docId, sessionUser.id, docName, sizeLabel, 0, 0, 'indexing', 'pdf_chunks'],
    })

    // Run PDF extraction asynchronously or block synchronously to return immediately
    const buffer = Buffer.from(await file.arrayBuffer())
    
    let pdfData
    try {
      const parser = new PDFParse({ data: buffer })
      pdfData = await parser.getText()
    } catch (parseErr) {
      console.error('[PDF Parse Error]:', parseErr)
      await db.execute({
        sql: "UPDATE documents SET status = 'failed' WHERE id = ?",
        args: [docId],
      })
      return NextResponse.json({ error: 'Failed to extract text from PDF.' }, { status: 422 })
    }

    const rawText = pdfData.text || ''
    const totalPages = pdfData.total || 1

    // Chunking text
    // Split by form-feed (default page separator in pdf-parse)
    const pages = rawText.split(/\u000c|\f/)
    const chunks: { id: string; docName: string; text: string; page: number; chunkIndex: number }[] = []
    
    let chunkIndex = 0
    const chunkSize = 600
    const overlap = 150

    pages.forEach((pageText, index) => {
      const pageNum = index + 1
      const text = pageText.replace(/\s+/g, ' ').trim()
      if (!text) return

      let cursor = 0
      while (cursor < text.length) {
        const end = Math.min(cursor + chunkSize, text.length)
        const chunkText = text.slice(cursor, end).trim()
        
        if (chunkText.length > 20) { // Skip trivial chunks
          chunks.push({
            id: `${docId}_c${chunkIndex}`,
            docName,
            text: chunkText,
            page: pageNum,
            chunkIndex,
          })
          chunkIndex++
        }
        
        cursor += (chunkSize - overlap)
      }
    })

    // If no chunks were created, fallback to treating document as a single chunk
    if (chunks.length === 0 && rawText.trim().length > 0) {
      chunks.push({
        id: `${docId}_c0`,
        docName,
        text: rawText.replace(/\s+/g, ' ').trim().slice(0, chunkSize),
        page: 1,
        chunkIndex: 0,
      })
    }

    // Upsert chunks to Qdrant/Fallback store
    await vectorStore.upsertChunks(sessionUser.id, docId, chunks)

    // Update document status to ready with stats
    await db.execute({
      sql: `UPDATE documents 
            SET pages = ?, chunks = ?, status = 'ready' 
            WHERE id = ?`,
      args: [totalPages, chunks.length, docId],
    })

    return NextResponse.json({
      id: docId,
      name: docName,
      sizeLabel,
      pages: totalPages,
      chunks: chunks.length,
      status: 'ready',
      addedAt: 'Just now',
    })
  } catch (err: any) {
    console.error('[Upload Document API] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred during file upload.' },
      { status: 500 }
    )
  }
}
