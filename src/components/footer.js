export function renderFooter() {
  const year = new Date().getFullYear()

  return `
    <footer class="bg-light border-top mt-auto py-3">
      <div class="container text-center text-muted small">
        &copy; ${year} Movie Watchlist
      </div>
    </footer>
  `
}
