import { Layers } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Layers className="size-4" aria-hidden="true" />
      </span>
      <span className="font-mono text-sm font-semibold tracking-[0.16em] uppercase">
        Corpus
      </span>
    </span>
  )
}
