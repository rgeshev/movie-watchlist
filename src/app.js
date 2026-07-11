import { createRouter } from './router.js'
import { renderLayout, bindLayout } from './components/layout.js'
import { renderHomePage } from './pages/home.js'
import { renderLoginPage, bindLoginPage } from './pages/login.js'
import { renderDashboardPage, bindDashboardPage } from './pages/dashboard.js'
import { renderMoviesPage, bindMoviesPage } from './pages/movies.js'
import { renderSeriesPage, bindSeriesPage } from './pages/series.js'
import { renderAdminPage, bindAdminPage } from './pages/admin.js'
import { renderMoviePage } from './pages/movie.js'
import { initAuth, onAuthChange, getUser, getProfile, isAdmin } from './lib/auth.js'
import { isSupabaseConfigured } from './lib/supabase.js'
import { toast } from './components/toast.js'

const routes = [
  { path: '/', render: renderHomePage },
  { path: '/login', render: renderLoginPage },
  { path: '/dashboard', render: renderDashboardPage },
  { path: '/movies', render: renderMoviesPage },
  { path: '/series', render: renderSeriesPage },
  { path: '/admin', render: renderAdminPage },
  { path: '/movies/:id/', render: renderMoviePage },
]

function normalizePath(pathname) {
  const path = pathname || '/'

  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }

  return path
}

export async function initApp() {
  const app = document.querySelector('#app')
  const router = createRouter(routes)

  try {
    await initAuth()
  } catch (error) {
    console.error('Failed to initialize auth:', error)
    toast.error('Could not restore your session. Please sign in again.')
  }

  function render() {
    const user = getUser()
    const pathname = normalizePath(window.location.pathname)

    if (pathname === '/login' && user) {
      router.navigate('/dashboard')
      return
    }

    const protectedPaths = ['/dashboard', '/movies', '/series', '/admin']

    if (protectedPaths.includes(pathname) && !user) {
      router.navigate('/login')
      return
    }

    if (pathname === '/admin' && !isAdmin()) {
      router.navigate('/dashboard')
      return
    }

    const { render: renderPage, params } = router.resolve()
    const configWarning = !isSupabaseConfigured()
      ? `
        <div class="container pt-3">
          <div class="alert alert-warning mb-0">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and
            <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file, then restart the dev server.
          </div>
        </div>
      `
      : ''

    app.innerHTML = renderLayout(configWarning + renderPage(params), user, getProfile())
    bindLayout(app, router)

    if (pathname === '/login') {
      bindLoginPage(app, router)
    }

    if (pathname === '/dashboard') {
      bindDashboardPage(app, router)
    }

    if (pathname === '/movies') {
      bindMoviesPage(app)
    }

    if (pathname === '/series') {
      bindSeriesPage(app)
    }

    if (pathname === '/admin') {
      bindAdminPage(app)
    }
  }

  router.onChange(render)
  onAuthChange(render)
  render()
}
