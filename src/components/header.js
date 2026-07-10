export function renderHeader(user) {
  const authNav = user
    ? `
      <li class="nav-item">
        <span class="nav-link text-white-50">${user.user_metadata?.username || user.email}</span>
      </li>
      <li class="nav-item ms-lg-3">
        <button type="button" class="btn btn-outline-light btn-sm" data-logout>Log out</button>
      </li>
    `
    : `
      <li class="nav-item ms-lg-3">
        <a class="btn btn-primary btn-sm" href="/login" data-link>Sign in</a>
      </li>
    `

  return `
    <header>
      <nav class="navbar navbar-expand-lg mw-navbar sticky-top">
        <div class="container">
          <a class="navbar-brand" href="/" data-link>
            Watchlist<span class="mw-brand-dot">.</span>
          </a>
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
            <ul class="navbar-nav ms-auto align-items-lg-center">
              <li class="nav-item">
                <a class="nav-link" href="/" data-link>Home</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/dashboard" data-link>Dashboard</a>
              </li>
              ${authNav}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  `
}
