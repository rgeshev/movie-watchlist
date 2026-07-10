const TOAST_DELAY_MS = 5000

const toastStyles = {
  error: 'mw-toast mw-toast--error',
  info: 'mw-toast mw-toast--info',
  success: 'mw-toast mw-toast--success',
  warning: 'mw-toast mw-toast--warning',
}

let container = null

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function ensureContainer() {
  if (container?.isConnected) {
    return container
  }

  container = document.createElement('div')
  container.id = 'mw-toast-container'
  container.className = 'toast-container position-fixed top-0 end-0 p-3 mw-toast-container'
  container.setAttribute('aria-live', 'polite')
  container.setAttribute('aria-atomic', 'true')
  document.body.appendChild(container)

  return container
}

function showToast(message, type = 'info') {
  const toastContainer = ensureContainer()
  const toastClass = toastStyles[type] ?? toastStyles.info

  const toastElement = document.createElement('div')
  toastElement.className = `toast align-items-center border-0 ${toastClass}`
  toastElement.setAttribute('role', 'alert')
  toastElement.setAttribute('aria-live', 'assertive')
  toastElement.setAttribute('aria-atomic', 'true')
  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button
        type="button"
        class="btn-close btn-close-white me-2 m-auto"
        data-bs-dismiss="toast"
        aria-label="Close"
      ></button>
    </div>
  `

  toastContainer.appendChild(toastElement)

  const toast = window.bootstrap.Toast.getOrCreateInstance(toastElement, {
    autohide: true,
    delay: TOAST_DELAY_MS,
  })

  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove()
  })

  toast.show()
}

export const toast = {
  error(message) {
    showToast(message, 'error')
  },
  info(message) {
    showToast(message, 'info')
  },
  success(message) {
    showToast(message, 'success')
  },
  warning(message) {
    showToast(message, 'warning')
  },
}
