import { renderHeader } from './header.js'
import { renderFooter } from './footer.js'

export function renderLayout(pageContent) {
  return `
    <div class="app-shell d-flex flex-column min-vh-100">
      ${renderHeader()}
      <main id="page-content" class="container flex-grow-1 py-4">
        ${pageContent}
      </main>
      ${renderFooter()}
    </div>
  `
}

export function bindLayout(root, router) {
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
