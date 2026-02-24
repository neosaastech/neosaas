import { redirect } from 'next/navigation'

/**
 * Store page redirected to /dashboard
 * The shop is now accessible from the dashboard
 */
export default function StorePage() {
  redirect('/dashboard')
}
