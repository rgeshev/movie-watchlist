import { getUser } from '../lib/auth.js'
import { getMovieStats } from '../lib/movies.js'
import { getSeriesStats } from '../lib/series.js'
import { exportWatchlist, importWatchlist } from '../lib/watchlist-io.js'
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

      <div class="mw-dashboard-io mt-5">
        <h2 class="h4 mb-1">Your data</h2>
        <p class="text-muted mb-4 small">
          Download a backup of your entire watchlist or restore one from a previous export.
        </p>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <button type="button" class="btn btn-outline-light btn-sm" id="export-watchlist-btn">
            &#8595;&ensp;Export watchlist
          </button>
          <label class="btn btn-outline-light btn-sm mb-0" for="import-watchlist-file">
            &#8593;&ensp;Import watchlist
          </label>
          <input type="file" id="import-watchlist-file" accept=".json,application/json" class="d-none" />
          <span class="text-muted small d-none" id="import-status"></span>
        </div>
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

  // Export
  const exportBtn = root.querySelector('#export-watchlist-btn')
  exportBtn?.addEventListener('click', async () => {
    exportBtn.disabled = true
    exportBtn.textContent = 'Exporting…'

    const { error, counts } = await exportWatchlist()

    exportBtn.disabled = false
    exportBtn.innerHTML = '&#8595;&ensp;Export watchlist'

    if (error) {
      toast.error('Export failed. Please try again.')
      return
    }

    toast.success(
      `Exported ${counts.movies} movie${counts.movies !== 1 ? 's' : ''} and ${counts.series} series.`,
    )
  })

  // Import
  const importFile = root.querySelector('#import-watchlist-file')
  const importStatus = root.querySelector('#import-status')
  const importLabel = root.querySelector('[for="import-watchlist-file"]')

  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0]
    if (!file) return

    if (importLabel) {
      importLabel.setAttribute('aria-disabled', 'true')
      importLabel.style.pointerEvents = 'none'
      importLabel.style.opacity = '0.65'
    }

    if (importStatus) {
      importStatus.textContent = 'Importing…'
      importStatus.classList.remove('d-none')
    }

    const text = await file.text()
    const { error, counts } = await importWatchlist(text)

    // Reset file input so the same file can be re-imported
    importFile.value = ''

    if (importLabel) {
      importLabel.removeAttribute('aria-disabled')
      importLabel.style.removeProperty('pointer-events')
      importLabel.style.removeProperty('opacity')
    }

    if (importStatus) {
      importStatus.classList.add('d-none')
      importStatus.textContent = ''
    }

    if (error) {
      toast.error(error.message || 'Import failed. Please check the file and try again.')
      return
    }

    const msg = [
      counts.movies > 0 ? `${counts.movies} movie${counts.movies !== 1 ? 's' : ''}` : '',
      counts.series > 0 ? `${counts.series} series` : '',
    ]
      .filter(Boolean)
      .join(' and ')

    const skippedNote = counts.skipped > 0 ? ` (${counts.skipped} skipped)` : ''

    toast.success(msg ? `Imported ${msg}${skippedNote}.` : `Nothing new to import${skippedNote}.`)
  })
}
