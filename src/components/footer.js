export function renderFooter(user) {
  const year = new Date().getFullYear()
  const authLink = user
    ? ''
    : '<a href="/login" data-link class="small">Sign in</a>'

  return `
    <footer class="mw-footer mt-auto py-4">
      <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span class="fw-bold text-white">Watchlist<span style="color: var(--mw-green)">.</span></span>
          <span class="small">&copy; ${year} Movie Watchlist. Track what you watch.</span>
          ${authLink}
        </div>
      </div>
    </footer>
  `
}
