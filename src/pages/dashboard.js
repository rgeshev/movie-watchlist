import { getUser } from '../lib/auth.js'

export function renderDashboardPage() {
  const user = getUser()
  const displayName = user?.user_metadata?.username || user?.email || 'there'

  return `
    <section class="container py-5">
      <h1 class="h2 mb-3">Dashboard</h1>
      <p class="text-muted">Welcome back, <strong class="text-white">${displayName}</strong>.</p>
      <p class="text-muted mb-0">Your watchlist will appear here soon.</p>
    </section>
  `
}
