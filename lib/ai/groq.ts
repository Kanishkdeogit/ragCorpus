import { Groq } from 'groq-sdk'
import type { ChunkPayload } from '../vector/qdrant'
import type { Citation } from '../rag'

export type RagResult = {
  answer: string
  citations: Citation[]
}

export async function executeRAG(
  userId: string,
  question: string,
  chunks: ChunkPayload[]
): Promise<RagResult> {
  const apiKey = process.env.GROQ_API_KEY

  const citations: Citation[] = chunks.map((c, index) => ({
    docName: c.docName,
    page: c.page,
    score: 0.95 - index * 0.05, // Assign score ranking
  }))

  if (!apiKey) {
    console.log('[Groq] API key not found. Running local intelligent NLP text extractor.')
    const localAnswer = generateLocalNlpAnswer(question, chunks)
    return {
      answer: localAnswer,
      citations,
    }
  }

  try {
    const groq = new Groq({ apiKey })
    
    const contextPrompt = chunks.map((c, i) => 
      `[Source ID: ${i + 1}] | Doc: ${c.docName} | Page: ${c.page}\nContent: ${c.text}`
    ).join('\n\n')

    const systemMessage = `You are an expert PDF RAG assistant. You answer user queries based STRICTLY on the provided context passages. 
When answering, make sure to reference the source page number or source document in your text where possible.
If the answer cannot be found in the provided context, state that you cannot find the information in the documents.

Context:
${contextPrompt}`

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: question },
      ],
      model: 'qwen/qwen3.8-27b',
      temperature: 0.2,
      max_tokens: 1024,
    })

    const answer = chatCompletion.choices[0]?.message?.content || 'No response generated.'

    return {
      answer,
      citations,
    }
  } catch (err) {
    console.error('[Groq] Error generating completion from Groq API, using local backup:', err)
    return {
      answer: generateLocalNlpAnswer(question, chunks),
      citations,
    }
  }
}

// Highly responsive local fallback RAG summarizer
// It scans chunks for query terms and extracts matching sentence fragments.
function generateLocalNlpAnswer(question: string, chunks: ChunkPayload[]): string {
  if (chunks.length === 0) {
    return 'There are no indexed PDF sources. Upload a PDF in the Sources sidebar first.'
  }

  const queryTerms = question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 3) // Focus on significant keywords

  const matchedSentences: string[] = []

  for (const chunk of chunks) {
    // Split text into sentences
    const sentences = chunk.text.split(/[.!?]+\s+/)
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim()
      if (cleanSentence.length < 15) continue

      // Count keyword overlaps
      const lowercaseSentence = cleanSentence.toLowerCase()
      const matches = queryTerms.filter((term) => lowercaseSentence.includes(term)).length

      if (matches > 0) {
        matchedSentences.push(`${cleanSentence} (from ${chunk.docName}, p. ${chunk.page})`)
      }
    }
  }

  if (matchedSentences.length > 0) {
    // Limit to top 3 matching sentences to form a concise response
    const selected = matchedSentences.slice(0, 3)
    return `[Offline Mode] Here is what I found in the sources matching your search:\n\n${selected.map(s => `• ${s}`).join('\n')}\n\n(Configure GROQ_API_KEY in .env to enable full AI model responses).`
  }

  // Fallback to top passages preview if no sentence keywords match
  const topChunk = chunks[0]
  const snippet = topChunk.text.substring(0, 300) + '...'
  return `[Offline Mode] I found matching passages in "${topChunk.docName}" (Page ${topChunk.page}), but no sentences directly containing the search terms. Here is a snippet of the most relevant content:\n\n"${snippet}"\n\n(Configure GROQ_API_KEY in .env to enable full AI model responses).`
}
