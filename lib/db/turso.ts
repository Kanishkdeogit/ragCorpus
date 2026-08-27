import { createClient, type Client } from '@libsql/client'

let dbClient: Client | null = null

export function getDb(): Client {
  if (dbClient) return dbClient

  const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  console.log(`[Turso DB] Connecting to database using url: ${url}`)
  
  dbClient = createClient({
    url,
    authToken,
  })

  // Initialize the database tables synchronously or via an async operation trigger
  initializeTables(dbClient).catch((err) => {
    console.error('[Turso DB] Failed to initialize database tables:', err)
  })

  return dbClient
}

async function initializeTables(client: Client) {
  // Check/create users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Check/create sessions table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Check/create documents table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      size_label TEXT NOT NULL,
      pages INTEGER NOT NULL,
      chunks INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'indexing',
      qdrant_collection TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Check/create chat_messages table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('[Turso DB] Tables initialized successfully.')
}
