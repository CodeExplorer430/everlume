import { Suspense } from 'react'
import { ResetPasswordScreen } from '@/components/pages/auth/ResetPasswordScreen'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  )
}
