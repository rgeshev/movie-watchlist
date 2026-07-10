import { getUser } from '../lib/auth.js'
import { getMovieStats } from '../lib/movies.js'
import { getSeriesStats } from '../lib/series.js'
import { toast } from '../components/toast.js'
import { bindLinks } from '../components/layout.js'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderStatValue(value, loading) {
  if (loading) {
    return '<span class="placeholder col-4 mw-dashboard-stat__placeholder"></span>'
  }

  return `<span class="mw-dashboard-stat__value">${value}</span>`
}

function renderStatGroup({ title, icon, href, stats = null, loading = false, error = false }) {
  const safeTitle = escapeHtml(title)

  return `
    <div class="col-12 col-lg-6">
      <div class="card mw-dashboard-card h-100">
        <div class="card-body p-4">
          <div class="d-flex align-items-start justify-content-between gap-3 mb-4">
            <div>
              <div class="mw-dashboard-card__icon" aria-hidden="true">${icon}</div>
              <h2 class="h4 mb-1">${safeTitle}</h2>
              <p class="text-muted mb-0 small">Your ${safeTitle.toLowerCase()} watchlist at a glance.</p>
            </div>
            <a href="${href}" data-link class="btn btn-accent btn-sm">View board</a>
          </div>

          ${
            error
              ? `
                <p class="text-muted mb-0">Could not load ${safeTitle.toLowerCase()} stats.</p>
              `
              : `
                <div class="row g-3">
                  <div class="col-4">
                    <div class="mw-dashboard-stat">
                      <span class="mw-dashboard-stat__label">Total</span>
                      ${renderStatValue(stats?.total ?? 0, loading)}
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="mw-dashboard-stat">
                      <span class="mw-dashboard-stat__label">Want to Watch</span>
                      ${renderStatValue(stats?.want_to_watch ?? 0, loading)}
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="mw-dashboard-stat">
                      <span class="mw-dashboard-stat__label">Watched</span>
                      ${renderStatValue(stats?.watched ?? 0, loading)}
                    </div>
                  </div>
                </div>
              `
          }
        </div>
      </div>
    </div>
  `
}

export function renderDashboardPage() {
  const user = getUser()
  const displayName = escapeHtml(user?.user_metadata?.username || user?.email || 'there')

  return `
    <section class="container py-5" id="dashboard-page">
      <h1 class="h2 mb-3">Dashboard</h1>
      <p class="text-muted mb-5">
        Welcome back, <strong class="text-white">${displayName}</strong>.
      </p>

      <div class="row g-4" id="dashboard-stats">
        ${renderStatGroup({ title: 'Movies', icon: '&#127916;', href: '/movies', loading: true })}
        ${renderStatGroup({ title: 'Series', icon: '&#128250;', href: '/series', loading: true })}
      </div>
    </section>
  `
}

export async function bindDashboardPage(root, router) {
  const statsContainer = root.querySelector('#dashboard-stats')

  if (!statsContainer) {
    return
  }

  const [moviesResult, seriesResult] = await Promise.all([getMovieStats(), getSeriesStats()])

  if (moviesResult.error || seriesResult.error) {
    toast.error('Could not load your watchlist stats.')
  }

  statsContainer.innerHTML = `
    ${renderStatGroup({
      title: 'Movies',
      icon: '&#127916;',
      href: '/movies',
      stats: moviesResult.stats,
      loading: false,
      error: Boolean(moviesResult.error),
    })}
    ${renderStatGroup({
      title: 'Series',
      icon: '&#128250;',
      href: '/series',
      stats: seriesResult.stats,
      loading: false,
      error: Boolean(seriesResult.error),
    })}
  `

  bindLinks(statsContainer, router)
}
