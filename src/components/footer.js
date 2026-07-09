export function renderFooter() {
  const year = new Date().getFullYear()

  return `
    <footer class="mw-footer mt-auto py-4">
      <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span class="fw-bold text-white">Watchlist<span style="color: var(--mw-green)">.</span></span>
          <span class="small">&copy; ${year} Movie Watchlist. Track what you watch.</span>
          <div class="d-flex gap-3 small">
            <a href="/dashboard" data-link>Dashboard</a>
            <a href="/login" data-link>Sign in</a>
          </div>
        </div>
      </div>
    </footer>
  `
}
