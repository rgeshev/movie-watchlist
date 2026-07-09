export function renderHeader() {
  return `
    <header>
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
          <a class="navbar-brand" href="/" data-link>Movie Watchlist</a>
          <button
            class="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="mainNavbar">
            <ul class="navbar-nav ms-auto">
              <li class="nav-item">
                <a class="nav-link" href="/" data-link>Home</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/login" data-link>Login</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/dashboard" data-link>Dashboard</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/movies/42/" data-link>Sample Movie</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  `
}
