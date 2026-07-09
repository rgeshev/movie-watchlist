import { createRouter } from './router.js'
import { renderLayout, bindLayout } from './components/layout.js'
import { renderHomePage } from './pages/home.js'
import { renderLoginPage } from './pages/login.js'
import { renderDashboardPage } from './pages/dashboard.js'
import { renderMoviePage } from './pages/movie.js'

const routes = [
  { path: '/', render: renderHomePage },
  { path: '/login', render: renderLoginPage },
  { path: '/dashboard', render: renderDashboardPage },
  { path: '/movies/:id/', render: renderMoviePage },
]

export function initApp() {
  const app = document.querySelector('#app')
  const router = createRouter(routes)

  function render() {
    const { render: renderPage, params } = router.resolve()
    app.innerHTML = renderLayout(renderPage(params))
    bindLayout(app, router)
  }

  router.onChange(render)
  render()
}
