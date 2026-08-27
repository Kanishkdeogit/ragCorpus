import Link from 'next/link'
import { FileText, Quote, Search } from 'lucide-react'

import { Logo } from '@/components/logo'

const points = [
  {
    icon: FileText,
    title: 'Bring your own PDFs',
    body: 'Contracts, runbooks, reports. Chunked and embedded on upload.',
  },
  {
    icon: Search,
    title: 'Hybrid retrieval',
    body: 'Dense vectors plus keyword matching, then a reranking pass.',
  },
  {
    icon: Quote,
    title: 'Answers with receipts',
    body: 'Every claim links back to the exact page it came from.',
  },
]

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      <section className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>

          <p className="mt-10 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {subtitle}
          </p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-sm text-muted-foreground">{footer}</div>
        </div>
      </section>

      <section className="hidden border-l border-border bg-sidebar lg:flex lg:w-[46%] lg:flex-col lg:justify-center">
        <div className="grid-paper flex flex-1 flex-col justify-center px-16 py-16">
          <div className="max-w-md">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm leading-relaxed">
                What is the termination notice period in the vendor agreement?
              </p>
            </div>

            <div className="mt-3 ml-8 rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm leading-relaxed text-pretty">
                Either party may terminate for convenience with 60 days written
                notice. Material breach is 30 days, with a 15 day cure window.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  ['vendor-msa-signed.pdf', 'p.9'],
                  ['vendor-msa-signed.pdf', 'p.12'],
                ].map(([doc, page], i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[0.7rem] text-secondary-foreground"
                  >
                    <span className="truncate">{doc}</span>
                    <span className="text-primary">{page}</span>
                  </span>
                ))}
              </div>
            </div>

            <ul className="mt-12 flex flex-col gap-6">
              {points.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
