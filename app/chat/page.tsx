'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, PanelLeft, Database } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/chat-panel'
import { SourcesPanel } from '@/components/sources-panel'
import { Logo } from '@/components/logo'
import { UserManagementModal } from '@/components/user-management-modal'
import type { ChatMessage, PdfDoc } from '@/lib/rag'
import { formatBytes } from '@/lib/rag'

export default function ChatPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<PdfDoc[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Session user profile state
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [dbStatus, setDbStatus] = useState<'connected' | 'mock'>('mock')

  // Load session user and sync database contents
  useEffect(() => {
    fetchProfile()
    fetchDocs()
    fetchHistory()
  }, [])

  function fetchProfile() {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/login')
          return
        }
        const data = await res.json()
        setUser(data.user)
      })
      .catch(() => router.push('/login'))
  }

  function fetchDocs() {
    fetch('/api/documents')
      .then(async (res) => {
        const data = await res.json()
        if (Array.isArray(data)) {
          setDocs(data)
          // Determine if we are connected to cloud or mock DB
          setDbStatus(data.length > 0 ? 'connected' : 'mock')
        }
      })
      .catch((err) => console.error('[Docs Sync Error]:', err))
  }

  function fetchHistory() {
    fetch('/api/chat')
      .then(async (res) => {
        const data = await res.json()
        if (Array.isArray(data)) {
          setMessages(data)
        }
      })
      .catch((err) => console.error('[History Sync Error]:', err))
  }

  async function handleAdd(files: FileList) {
    const file = files[0]
    if (!file) return

    // Create optimistic indexing item
    const tempId = `temp_${Date.now()}`
    const tempDoc: PdfDoc = {
      id: tempId,
      name: file.name,
      sizeLabel: formatBytes(file.size),
      pages: 0,
      chunks: 0,
      status: 'indexing',
      addedAt: 'Just now',
    }
    setDocs((prev) => [tempDoc, ...prev])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to upload document.')
      }

      const finalDoc = await res.json()
      setDocs((prev) => prev.map((d) => (d.id === tempId ? finalDoc : d)))
      setDbStatus('connected')
    } catch (err: any) {
      console.error(err)
      setDocs((prev) =>
        prev.map((d) => (d.id === tempId ? { ...d, status: 'failed' as const } : d))
      )
    }
  }

  async function handleDelete(id: string) {
    if (id.startsWith('temp_')) return

    // Optimistically remove from state
    setDocs((prev) => prev.filter((d) => d.id !== id))

    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Deletion failed')
    } catch (err) {
      console.error('[Document Delete Error]:', err)
      fetchDocs() // Re-sync if delete fails
    }
  }

  async function handleSubmit(value: string) {
    const question = value.trim()
    if (!question || busy) return

    const pendingId = `m_pending_${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: `m_${Date.now()}`, role: 'user', content: question },
      { id: pendingId, role: 'assistant', content: '', pending: true },
    ])
    setInput('')
    setBusy(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to get answer.')
      }

      const reply = await res.json()
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? reply : m)))
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                id: `m_err_${Date.now()}`,
                role: 'assistant',
                content: `Error: ${err.message || 'Unable to connect to RAG backend service.'}`,
              }
            : m
        )
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block">
        <SourcesPanel
          docs={docs}
          onAdd={handleAdd}
          onDelete={handleDelete}
          currentUser={user}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 z-0 bg-foreground/40"
          />
          <div className="absolute inset-y-0 left-0 z-10 flex w-[85%] max-w-xs animate-in slide-in-from-left duration-200">
            <div className="flex-1 border-r border-sidebar-border">
              <SourcesPanel
                docs={docs}
                onAdd={handleAdd}
                onDelete={handleDelete}
                currentUser={user}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onCloseMobile={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Open sources panel"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden"
            >
              <PanelLeft />
            </Button>
            <span className="lg:hidden">
              <Logo />
            </span>
            <div className="hidden min-w-0 lg:block">
              <h1 className="truncate text-sm font-medium">Workspace chat</h1>
              <p className="truncate font-mono text-[0.7rem] text-muted-foreground flex items-center gap-1">
                {docs.filter((d) => d.status === 'ready').length} sources in context
              </p>
            </div>
            
            {/* Status indicator badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-mono font-medium ${
              dbStatus === 'connected' 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
            }`}>
              <Database className="size-3" />
              {dbStatus === 'connected' ? 'Database Connected' : 'Local Persistence'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/login')
            }}
          >
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </header>

        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          busy={busy}
        />
      </main>

      <UserManagementModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={user}
        onUserUpdated={fetchProfile}
      />
    </div>
  )
}
