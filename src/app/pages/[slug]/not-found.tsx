import { redirect } from 'next/navigation'

export default function LegacyPagesNotFoundRedirect() {
  redirect('/memorials/unknown')
}
