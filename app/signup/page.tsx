import Link from 'next/link'

import { AuthShell } from '@/components/auth-shell'
import { SignupForm } from '@/components/signup-form'

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Start querying your PDFs"
      subtitle="Upload a document, ask a question, and get an answer that cites the page it came from."
      footer={
        <>
          {'Already have an account? '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  )
}
