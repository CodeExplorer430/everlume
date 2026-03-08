import { Suspense } from 'react'
import { LoginScreen } from '@/components/pages/auth/LoginScreen'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  )
}
