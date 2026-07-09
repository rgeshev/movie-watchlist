function normalizePath(pathname) {
  const path = pathname || '/'

  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }

  return path
}

function formatPath(path) {
  const normalized = normalizePath(path)

  if (/^\/movies\/[^/]+$/.test(normalized)) {
    return `${normalized}/`
  }

  return normalized || '/'
}

function matchRoute(routePath, pathname) {
  const routeSegments = routePath.split('/').filter(Boolean)
  const pathSegments = pathname.split('/').filter(Boolean)

  if (routeSegments.length !== pathSegments.length) {
    return null
  }

  const params = {}

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index]
    const pathSegment = pathSegments[index]

    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment)
      continue
    }

    if (routeSegment !== pathSegment) {
      return null
    }
  }

  return params
}

export function createRouter(routes) {
  const listeners = new Set()

  function resolve() {
    const pathname = normalizePath(window.location.pathname)

    for (const route of routes) {
      const params = matchRoute(route.path, pathname)

      if (params) {
        return { render: route.render, params }
      }
    }

    return {
      render: () => `
        <div class="container text-center py-5">
          <h1 class="display-6">Page not found</h1>
          <p class="text-muted">No page matches <code>${pathname}</code>.</p>
          <a href="/" data-link class="btn btn-primary">Go home</a>
        </div>
      `,
      params: {},
    }
  }

  function navigate(path) {
    const nextPath = formatPath(path)
    const currentPath = formatPath(window.location.pathname)

    if (nextPath === currentPath) {
      return
    }

    window.history.pushState({}, '', nextPath)
    listeners.forEach((listener) => listener())
  }

  function onChange(listener) {
    listeners.add(listener)

    window.addEventListener('popstate', listener)

    return () => {
      listeners.delete(listener)
      window.removeEventListener('popstate', listener)
    }
  }

  return { resolve, navigate, onChange }
}
