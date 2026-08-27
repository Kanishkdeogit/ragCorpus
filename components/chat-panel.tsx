'use client'

import { useEffect, useRef } from 'react'
import { ArrowUp, LoaderCircle, Quote } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/rag'
import { suggestedPrompts } from '@/lib/rag'

function Citations({ citations }: { citations: NonNullable<ChatMessage['citations']> }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="flex items-center gap-1.5 font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        <Quote className="size-3" aria-hidden="true" />
        Sources
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <li key={`${c.docName}-${c.page}-${i}`}>
            <span className="inline-flex max-w-[15rem] items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[0.7rem] text-secondary-foreground">
              <span className="truncate">{c.docName}</span>
              <span className="text-primary">p.{c.page}</span>
              <span className="text-muted-foreground">{c.score.toFixed(2)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser ? (
        <span
          aria-hidden="true"
          className="mt-1 hidden size-7 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[0.7rem] font-semibold text-primary-foreground sm:flex"
        >
          C
        </span>
      ) : null}

      <div
        className={cn(
          'max-w-[85%] rounded-xl border px-4 py-3 sm:max-w-[42rem]',
          isUser
            ? 'border-transparent bg-primary text-primary-foreground'
            : 'border-border bg-card text-card-foreground',
        )}
      >
        {message.pending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Retrieving passages…
          </p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">
            {message.content}
          </p>
        )}

        {message.citations?.length ? (
          <Citations citations={message.citations} />
        ) : null}
      </div>
    </div>
  )
}

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  busy,
}: {
  messages: ChatMessage[]
  input: string
  onInputChange: (value: string) => void
  onSubmit: (value: string) => void
  busy: boolean
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  function send() {
    if (!input.trim() || busy) return
    onSubmit(input)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-start gap-6 py-10">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-balance">
                  Ask anything about your documents
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                  Answers are grounded in the PDFs listed under Sources, and
                  every response cites the pages it drew from.
                </p>
              </div>
              <ul className="flex flex-col gap-2 self-stretch sm:grid sm:grid-cols-2">
                {suggestedPrompts.map((prompt) => (
                  <li key={prompt} className="flex">
                    <button
                      type="button"
                      onClick={() => onSubmit(prompt)}
                      className="flex-1 rounded-lg border border-border bg-card px-3 py-3 text-left text-sm leading-relaxed transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:border-ring/60"
          >
            <label htmlFor="composer" className="sr-only">
              Ask a question about your documents
            </label>
            <textarea
              id="composer"
              ref={textareaRef}
              rows={1}
              value={input}
              placeholder="Ask a question about your PDFs…"
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault()
                  send()
                }
              }}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={busy || !input.trim()}
              aria-label="Send question"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp aria-hidden="true" />
              )}
            </Button>
          </form>
          <p className="mt-2 px-1 font-mono text-[0.7rem] text-muted-foreground">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </div>
  )
}
