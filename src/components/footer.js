export function renderFooter(user) {
  const year = new Date().getFullYear()
  const authLink = user
    ? '<button type="button" class="btn btn-link p-0 border-0 align-baseline" data-logout>Log out</button>'
    : '<a href="/login" data-link>Sign in</a>'

  return `
    <footer class="mw-footer mt-auto py-4">
      <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span class="fw-bold text-white">Watchlist<span style="color: var(--mw-green)">.</span></span>
          <span class="small">&copy; ${year} Movie Watchlist. Track what you watch.</span>
          <div class="d-flex gap-3 small">
            <a href="/dashboard" data-link>Dashboard</a>
            ${authLink}
          </div>
        </div>
      </div>
    </footer>
  `
}
