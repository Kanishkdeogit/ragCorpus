import { QdrantClient } from '@qdrant/js-client-rest'

// Deterministic hash-based embedding generator (384 dimensions)
// This creates dense vectors locally without external APIs. It ensures
// similar texts get higher cosine similarity scores, serving as a functional local RAG engine.
export function generateEmbedding(text: string): number[] {
  const dims = 384
  const vector = new Array(dims).fill(0)
  
  // Basic text normalization & tokenization
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 1)

  if (tokens.length === 0) {
    // Return a dummy unit vector if empty
    vector[0] = 1
    return vector
  }

  // Hash words to indices with positive or negative weights
  for (const token of tokens) {
    for (let i = 0; i < 3; i++) {
      // Simple hash variations
      let hash = 0
      for (let j = 0; j < token.length; j++) {
        hash = (hash * 33) ^ token.charCodeAt(j) ^ i
      }
      const index = Math.abs(hash) % dims
      const val = hash % 2 === 0 ? 1 : -1
      vector[index] += val
    }
  }

  // Normalize to unit length (L2 norm)
  let norm = 0
  for (let i = 0; i < dims; i++) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)
  
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      vector[i] /= norm
    }
  } else {
    vector[0] = 1
  }

  return vector
}

export type ChunkPayload = {
  id: string
  docId: string
  docName: string
  userId: string
  text: string
  page: number
  chunkIndex: number
}

// In-memory fallback database for vectors when Qdrant is not configured
interface MockPoint {
  id: string
  vector: number[]
  payload: ChunkPayload
}

const mockVectorStore: Map<string, MockPoint[]> = new Map()

export class VectorStoreService {
  private client: QdrantClient | null = null
  private collectionName = 'pdf_chunks'

  constructor() {
    const url = process.env.QDRANT_URL
    const apiKey = process.env.QDRANT_API_KEY

    if (url) {
      console.log(`[Qdrant] Connecting to cloud vector DB at: ${url}`)
      this.client = new QdrantClient({ url, apiKey })
      this.initCollection()
    } else {
      console.log('[Qdrant] URL not configured. Running in local in-memory fallback mode.')
    }
  }

  private async initCollection() {
    if (!this.client) return
    try {
      const collections = await this.client.getCollections()
      const exists = collections.collections.some((c) => c.name === this.collectionName)
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384,
            distance: 'Cosine',
          },
        })
        console.log(`[Qdrant] Collection '${this.collectionName}' created successfully.`)
      }
      // Ensure payload indexes are created for strict mode
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'userId',
          field_schema: 'keyword',
          wait: true,
        })
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'docId',
          field_schema: 'keyword',
          wait: true,
        })
        console.log(`[Qdrant] Payload indexes for userId and docId verified/created.`)
      } catch (idxErr: any) {
        console.error('[Qdrant] Error creating payload indexes:', idxErr.message)
      }
    } catch (err) {
      console.error('[Qdrant] Failed to initialize Qdrant collection:', err)
    }
  }

  async upsertChunks(userId: string, docId: string, chunks: Omit<ChunkPayload, 'userId' | 'docId'>[]) {
    const points = chunks.map((chunk) => {
      const payload: ChunkPayload = {
        ...chunk,
        userId,
        docId,
      }
      const vector = generateEmbedding(chunk.text)
      return {
        id: chunk.id,
        vector,
        payload,
      }
    })

    if (this.client) {
      try {
        await this.client.upsert(this.collectionName, {
          wait: true,
          points: points.map((p) => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload,
          })),
        })
        console.log(`[Qdrant] Successfully upserted ${points.length} chunks to Qdrant.`)
      } catch (err) {
        console.error('[Qdrant] Error uploading vectors, falling back to local store:', err)
        this.upsertMock(userId, points)
      }
    } else {
      this.upsertMock(userId, points)
    }
  }

  private upsertMock(userId: string, points: MockPoint[]) {
    const current = mockVectorStore.get(userId) || []
    mockVectorStore.set(userId, [...current, ...points])
    console.log(`[Qdrant Fallback] Stored ${points.length} chunks in-memory for user ${userId}. Total: ${mockVectorStore.get(userId)?.length}`)
  }

  async deleteDocumentChunks(userId: string, docId: string) {
    if (this.client) {
      try {
        await this.client.delete(this.collectionName, {
          filter: {
            must: [
              { key: 'userId', match: { value: userId } },
              { key: 'docId', match: { value: docId } },
            ],
          },
        })
        console.log(`[Qdrant] Deleted vectors for document ${docId}.`)
      } catch (err) {
        console.error('[Qdrant] Error deleting vectors, syncing mock storage:', err)
        this.deleteMock(userId, docId)
      }
    } else {
      this.deleteMock(userId, docId)
    }
  }

  private deleteMock(userId: string, docId: string) {
    const current = mockVectorStore.get(userId) || []
    mockVectorStore.set(userId, current.filter((p) => p.payload.docId !== docId))
    console.log(`[Qdrant Fallback] Deleted in-memory vectors for doc ${docId}. Remaining: ${mockVectorStore.get(userId)?.length}`)
  }

  async searchSimilarChunks(userId: string, query: string, limit = 5): Promise<ChunkPayload[]> {
    const queryVector = generateEmbedding(query)

    if (this.client) {
      try {
        const results = await this.client.query(this.collectionName, {
          query: queryVector,
          filter: {
            must: [
              { key: 'userId', match: { value: userId } },
            ],
          },
          limit,
          with_payload: true,
        })
        
        return results.points.map((r) => r.payload as ChunkPayload)
      } catch (err) {
        console.error('[Qdrant] Search failed, falling back to local memory store search:', err)
        return this.searchMock(userId, queryVector, limit)
      }
    } else {
      return this.searchMock(userId, queryVector, limit)
    }
  }

  private searchMock(userId: string, queryVector: number[], limit: number): ChunkPayload[] {
    const userPoints = mockVectorStore.get(userId) || []
    if (userPoints.length === 0) return []

    // Calculate cosine similarity (dot product of normalized vectors)
    const scoredPoints = userPoints.map((point) => {
      let score = 0
      for (let i = 0; i < queryVector.length; i++) {
        score += queryVector[i] * point.vector[i]
      }
      return { point, score }
    })

    // Sort by score descending
    scoredPoints.sort((a, b) => b.score - a.score)

    return scoredPoints.slice(0, limit).map((sp) => sp.point.payload)
  }
}

// Export singleton instance
export const vectorStore = new VectorStoreService()
