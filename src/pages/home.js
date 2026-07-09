const heroPosters = [
  {
    title: 'Dune: Part Two',
    year: 2024,
    genre: 'Sci-Fi',
    status: 'want-to-watch',
    label: 'Watchlist',
  },
  {
    title: 'Parasite',
    year: 2019,
    genre: 'Thriller',
    status: 'watched',
    label: 'Watched',
  },
  {
    title: 'Spirited Away',
    year: 2001,
    genre: 'Animation',
    status: 'watched',
    label: 'Watched',
  },
]

const features = [
  {
    icon: '&#127916;',
    title: 'Track movies & series',
    text: 'Keep every film and show you love in one place, organized the way you want.',
  },
  {
    icon: '&#9989;',
    title: 'Want to watch or watched',
    text: 'Split your collection into a watchlist and a watched log with a single tap.',
  },
  {
    icon: '&#127917;',
    title: 'Browse by genre',
    text: 'Filter your library by genre and year to rediscover what you have collected.',
  },
  {
    icon: '&#128444;',
    title: 'Beautiful poster wall',
    text: 'Your collection displayed as a rich, card-based grid of movie posters.',
  },
]

function posterCard({ title, year, genre, status, label }) {
  return `
    <div class="mw-poster-card">
      <span class="mw-poster-badge ${status}">${label}</span>
      <div class="mw-poster-card__body">
        <span class="mw-poster-card__genre">${genre}</span>
        <h3 class="mw-poster-card__title">${title}</h3>
        <span class="mw-poster-card__year">${year}</span>
      </div>
    </div>
  `
}

function featureCard({ icon, title, text }) {
  return `
    <div class="col-12 col-sm-6 col-lg-3">
      <div class="mw-feature-card">
        <div class="mw-feature-icon">${icon}</div>
        <h3 class="h5 fw-bold">${title}</h3>
        <p class="text-muted mb-0">${text}</p>
      </div>
    </div>
  `
}

export function renderHomePage() {
  return `
    <section class="mw-hero">
      <div class="container">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <p class="mw-hero__eyebrow mb-3">Your personal film diary</p>
            <h1 class="mw-hero__title mb-4">
              Track the films you
              <span class="accent-green">watch</span>.
              Save the ones you
              <span class="accent-amber">love</span>.
            </h1>
            <p class="mw-hero__lead mb-4">
              Build your watchlist, log what you have seen, and organize your
              movies and series by genre, year, and status &mdash; all in one
              beautifully simple place.
            </p>
            <div class="d-flex flex-wrap gap-3">
              <a href="/login" data-link class="btn btn-primary btn-lg">Get started &mdash; it's free</a>
              <a href="/dashboard" data-link class="btn btn-outline-light btn-lg">Explore dashboard</a>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="mw-hero__posters">
              ${heroPosters.map(posterCard).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mw-section">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="mw-section__title mb-2">Everything you need to track your watching</h2>
          <p class="mw-section__subtitle mb-0">Simple tools to organize your movies and series.</p>
        </div>
        <div class="row g-4">
          ${features.map(featureCard).join('')}
        </div>
      </div>
    </section>

    <section class="mw-section pt-0">
      <div class="container">
        <div class="mw-cta text-center">
          <h2 class="mw-section__title mb-3">Ready to build your watchlist?</h2>
          <p class="mw-section__subtitle mb-4">
            Join now and start tracking the films and series you care about.
          </p>
          <div class="d-flex flex-wrap justify-content-center gap-3">
            <a href="/login" data-link class="btn btn-primary btn-lg">Create your account</a>
            <a href="/dashboard" data-link class="btn btn-accent btn-lg">See a demo</a>
          </div>
        </div>
      </div>
    </section>
  `
}
