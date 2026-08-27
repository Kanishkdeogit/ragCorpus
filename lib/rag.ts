export type DocStatus = 'indexing' | 'ready' | 'failed'

export type PdfDoc = {
  id: string
  name: string
  sizeLabel: string
  pages: number
  chunks: number
  status: DocStatus
  addedAt: string
}

export type Citation = {
  docName: string
  page: number
  score: number
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  pending?: boolean
}

export const initialDocs: PdfDoc[] = [
  {
    id: 'doc_01',
    name: 'annual-report-2025.pdf',
    sizeLabel: '4.2 MB',
    pages: 88,
    chunks: 412,
    status: 'ready',
    addedAt: 'Aug 12',
  },
  {
    id: 'doc_02',
    name: 'infra-runbook-v3.pdf',
    sizeLabel: '1.1 MB',
    pages: 24,
    chunks: 96,
    status: 'ready',
    addedAt: 'Aug 19',
  },
  {
    id: 'doc_03',
    name: 'vendor-msa-signed.pdf',
    sizeLabel: '780 KB',
    pages: 16,
    chunks: 61,
    status: 'indexing',
    addedAt: 'Aug 26',
  },
]

export const initialMessages: ChatMessage[] = [
  {
    id: 'm_01',
    role: 'user',
    content: 'What is the termination notice period in the vendor agreement?',
  },
  {
    id: 'm_02',
    role: 'assistant',
    content:
      'Either party may terminate for convenience with 60 days written notice. Termination for material breach is 30 days, and the cure window inside that is 15 days from the date notice is received.',
    citations: [
      { docName: 'vendor-msa-signed.pdf', page: 9, score: 0.91 },
      { docName: 'vendor-msa-signed.pdf', page: 12, score: 0.84 },
    ],
  },
]

export const suggestedPrompts = [
  'Summarize the runbook escalation path',
  'What changed in operating margin year over year?',
  'List every deadline mentioned across all documents',
  'Which sections mention data retention?',
]

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Deterministic placeholder answer so the UI can be demoed without a backend. */
export function mockAnswer(question: string, docs: PdfDoc[]): ChatMessage {
  const ready = docs.filter((d) => d.status === 'ready')
  const source = ready[0]

  if (!source) {
    return {
      id: `m_${Date.now()}`,
      role: 'assistant',
      content:
        'There is nothing in the index yet. Add a PDF from the Sources panel and I will answer from its contents.',
    }
  }

  return {
    id: `m_${Date.now()}`,
    role: 'assistant',
    content: `Based on the indexed sources, here is what I found for "${question.trim()}". This is a frontend preview, so the answer text is placeholder copy — wire the composer to your retrieval endpoint and the citations below will render whatever chunks your reranker returns.`,
    citations: ready.slice(0, 2).map((doc, i) => ({
      docName: doc.name,
      page: 3 + i * 7,
      score: 0.88 - i * 0.06,
    })),
  }
}
