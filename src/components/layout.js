import { renderHeader } from './header.js'
import { renderFooter } from './footer.js'
import { signOut } from '../lib/auth.js'
import { toast } from './toast.js'

export function renderLayout(pageContent, user = null, profile = null) {
  return `
    <div class="app-shell d-flex flex-column min-vh-100">
      ${renderHeader(user, profile)}
      <main id="page-content" class="flex-grow-1">
        ${pageContent}
      </main>
      ${renderFooter(user)}
    </div>
  `
}

export function bindLinks(root, router) {
  root.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const href = link.getAttribute('href')

      if (!href || href.startsWith('http')) {
        return
      }

      event.preventDefault()
      router.navigate(href)
    })
  })
}

export function bindLayout(root, router) {
  bindLinks(root, router)

  root.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault()

      const { error } = await signOut()

      if (error) {
        toast.error(error.message)
        return
      }

      router.navigate('/')
    })
  })
}
