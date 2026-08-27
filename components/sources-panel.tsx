'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, LoaderCircle, LogOut, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import type { PdfDoc } from '@/lib/rag'

function StatusDot({ status }: { status: PdfDoc['status'] }) {
  if (status === 'indexing') {
    return (
      <LoaderCircle
        className="size-3 animate-spin text-primary"
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={
        status === 'ready'
          ? 'size-1.5 rounded-full bg-primary'
          : 'size-1.5 rounded-full bg-destructive'
      }
    />
  )
}

export function SourcesPanel({
  docs,
  onAdd,
  onDelete,
  onCloseMobile,
  currentUser,
  onOpenSettings,
}: {
  docs: PdfDoc[]
  onAdd: (files: FileList) => void
  onDelete: (id: string) => void
  onCloseMobile?: () => void
  currentUser?: { name: string; email: string } | null
  onOpenSettings?: () => void
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)

  const readyCount = docs.filter((d) => d.status === 'ready').length
  const chunkCount = docs.reduce((total, d) => total + d.chunks, 0)

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3">
        <Logo />
        {onCloseMobile ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCloseMobile}
            aria-label="Close sources panel"
            className="lg:hidden"
          >
            <X />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-b border-sidebar-border px-4 py-4">
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files)
            e.target.value = ''
          }}
        />
        <Button size="lg" onClick={() => fileInput.current?.click()}>
          <Plus aria-hidden="true" />
          Add PDFs
        </Button>
        <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground">
          {readyCount}/{docs.length} indexed · {chunkCount} chunks
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
        <p className="px-2 pb-2 font-mono text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
          Sources
        </p>

        {docs.length === 0 ? (
          <div className="mx-2 rounded-lg border border-dashed border-sidebar-border px-4 py-8 text-center">
            <FileText
              className="mx-auto size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium">No documents</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Add a PDF to build the index.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
              >
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.7rem] text-muted-foreground">
                    <StatusDot status={doc.status} />
                    {doc.status === 'indexing'
                      ? 'indexing…'
                      : `${doc.pages}p · ${doc.sizeLabel}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete ${doc.name}`}
                  onClick={() => onDelete(doc.id)}
                  className="text-muted-foreground opacity-100 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-1 items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-secondary-foreground">
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AL'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentUser?.name || 'Ada Lovelace'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser?.email || 'ada@company.com'}
            </p>
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Log out"
          title="Log out"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/login')
          }}
        >
          <LogOut />
        </Button>
      </div>
    </div>
  )
}
