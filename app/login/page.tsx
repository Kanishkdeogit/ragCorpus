import Link from 'next/link'

import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Pick up where you left off — your indexed documents are waiting."
      footer={
        <>
          {'New here? '}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
