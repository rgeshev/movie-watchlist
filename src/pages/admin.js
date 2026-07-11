import { getGenres } from '../lib/movies.js'
import {
  getAdminUsers,
  updateUserRole,
  deleteAuthUser,
  getAllMovies,
  getAllSeries,
  adminDeleteMovie,
  adminDeleteSeries,
} from '../lib/admin.js'
import { refreshProfile, getUser } from '../lib/auth.js'
import { toast } from '../components/toast.js'

const adminPageState = {
  bindId: 0,
  root: null,
  users: [],
  movies: [],
  series: [],
  genres: [],
  pendingDeleteUserId: null,
  pendingDeleteContent: null,
}

let adminListenersReady = false

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString()
}

function renderRoleBadge(role) {
  if (role === 'admin') {
    return '<span class="badge bg-warning text-dark">Admin</span>'
  }

  return '<span class="badge bg-secondary">User</span>'
}

function renderUsersTable(users, loading) {
  if (loading) {
    return `
      <div class="placeholder-glow">
        <span class="placeholder col-12 mb-2"></span>
        <span class="placeholder col-12 mb-2"></span>
        <span class="placeholder col-12"></span>
      </div>
    `
  }

  if (!users.length) {
    return '<p class="text-muted mb-0">No users found.</p>'
  }

  const currentUserId = getUser()?.id

  const rows = users
    .map((user) => {
      const label = escapeHtml(user.username || user.email || user.id)
      const isSelf = user.id === currentUserId

      return `
        <tr>
          <td>
            <div class="fw-semibold">${label}</div>
            <div class="small text-muted">${escapeHtml(user.email ?? '')}</div>
          </td>
          <td>${renderRoleBadge(user.role)}</td>
          <td>${user.movie_count ?? 0}</td>
          <td>${user.series_count ?? 0}</td>
          <td>${formatDate(user.created_at)}</td>
          <td class="text-end">
            <div class="d-flex justify-content-end gap-2 flex-wrap">
              <select
                class="form-select form-select-sm mw-admin-role-select"
                data-role-user="${user.id}"
                ${isSelf ? 'disabled' : ''}
                aria-label="Role for ${label}"
              >
                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                data-delete-user="${user.id}"
                data-delete-user-label="${label}"
                ${isSelf ? 'disabled' : ''}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      `
    })
    .join('')

  return `
    <div class="table-responsive">
      <table class="table table-dark table-hover align-middle mb-0 mw-admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Movies</th>
            <th>Series</th>
            <th>Joined</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function renderContentRows(items, type, userFilter) {
  const filtered = userFilter
    ? items.filter((item) => item.user_id === userFilter)
    : items

  if (!filtered.length) {
    return '<p class="text-muted mb-0">No items match this filter.</p>'
  }

  return `
    <div class="table-responsive">
      <table class="table table-dark table-hover align-middle mb-0 mw-admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Owner</th>
            <th>Genre</th>
            <th>Status</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((item) => {
              const title = escapeHtml(item.title)
              const owner = escapeHtml(item.profiles?.username ?? 'Unknown')
              const genre = escapeHtml(item.genres?.name ?? '—')
              const statusLabel =
                item.status === 'watched' ? 'Watched' : 'Want to Watch'

              return `
                <tr>
                  <td>
                    <div class="fw-semibold">${title}</div>
                    ${item.year ? `<div class="small text-muted">${escapeHtml(item.year)}</div>` : ''}
                  </td>
                  <td>${owner}</td>
                  <td>${genre}</td>
                  <td>${statusLabel}</td>
                  <td class="text-end">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      data-delete-content="${type}"
                      data-delete-content-id="${item.id}"
                      data-delete-content-title="${title}"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              `
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderUserFilterOptions(users, selectedUserId) {
  const options = users
    .map((user) => {
      const label = escapeHtml(user.username || user.email || user.id)
      const selected = user.id === selectedUserId ? 'selected' : ''
      return `<option value="${user.id}" ${selected}>${label}</option>`
    })
    .join('')

  return `<option value="">All users</option>${options}`
}

function refreshUsersPanel() {
  const panel = adminPageState.root?.querySelector('#admin-users-panel')

  if (panel) {
    panel.innerHTML = renderUsersTable(adminPageState.users, false)
  }
}

function refreshContentPanel(userFilter = '') {
  const moviesPanel = adminPageState.root?.querySelector('#admin-movies-panel')
  const seriesPanel = adminPageState.root?.querySelector('#admin-series-panel')
  const filterSelect = adminPageState.root?.querySelector('#admin-content-user-filter')

  if (filterSelect && filterSelect.value !== userFilter) {
    filterSelect.value = userFilter
  }

  if (moviesPanel) {
    moviesPanel.innerHTML = renderContentRows(adminPageState.movies, 'movie', userFilter || null)
  }

  if (seriesPanel) {
    seriesPanel.innerHTML = renderContentRows(adminPageState.series, 'series', userFilter || null)
  }
}

async function handleRoleChange(userId, role, previousRole) {
  const { profile, error } = await updateUserRole(userId, role)

  if (error) {
    toast.error(error.message || 'Could not update user role.')
    refreshUsersPanel()
    return
  }

  adminPageState.users = adminPageState.users.map((user) =>
    user.id === userId ? { ...user, role: profile.role } : user,
  )

  if (userId === getUser()?.id) {
    await refreshProfile()
  }

  toast.success(`User role updated to ${role}.`)
}

async function handleDeleteUser() {
  const userId = adminPageState.pendingDeleteUserId
  adminPageState.pendingDeleteUserId = null

  if (!userId) {
    return
  }

  const confirmButton = document.querySelector('#confirm-delete-admin-user')

  if (confirmButton) {
    confirmButton.disabled = true
  }

  const { error } = await deleteAuthUser(userId)

  if (confirmButton) {
    confirmButton.disabled = false
  }

  hideDeleteUserModal()

  if (error) {
    toast.error(error.message || 'Could not delete user.')
    return
  }

  adminPageState.users = adminPageState.users.filter((user) => user.id !== userId)
  adminPageState.movies = adminPageState.movies.filter((item) => item.user_id !== userId)
  adminPageState.series = adminPageState.series.filter((item) => item.user_id !== userId)
  refreshUsersPanel()
  refreshContentPanel()
  toast.success('User deleted.')
}

async function handleDeleteContent() {
  const pending = adminPageState.pendingDeleteContent
  adminPageState.pendingDeleteContent = null

  if (!pending) {
    return
  }

  const confirmButton = document.querySelector('#confirm-delete-admin-content')

  if (confirmButton) {
    confirmButton.disabled = true
  }

  const { error } =
    pending.type === 'movie'
      ? await adminDeleteMovie(pending.id)
      : await adminDeleteSeries(pending.id)

  if (confirmButton) {
    confirmButton.disabled = false
  }

  hideDeleteContentModal()

  if (error) {
    toast.error(error.message || 'Could not delete item.')
    return
  }

  if (pending.type === 'movie') {
    adminPageState.movies = adminPageState.movies.filter((item) => item.id !== pending.id)
  } else {
    adminPageState.series = adminPageState.series.filter((item) => item.id !== pending.id)
  }

  refreshContentPanel()
  toast.success(`${pending.type === 'movie' ? 'Movie' : 'Series'} deleted.`)
}

function showDeleteUserModal(userId, label) {
  adminPageState.pendingDeleteUserId = userId
  const titleElement = document.querySelector('#delete-admin-user-label')

  if (titleElement) {
    titleElement.textContent = label
  }

  window.bootstrap?.Modal.getOrCreateInstance(
    document.querySelector('#deleteAdminUserModal'),
  )?.show()
}

function hideDeleteUserModal() {
  window.bootstrap?.Modal.getOrCreateInstance(
    document.querySelector('#deleteAdminUserModal'),
  )?.hide()
}

function showDeleteContentModal(type, id, title) {
  adminPageState.pendingDeleteContent = { type, id }
  const titleElement = document.querySelector('#delete-admin-content-label')

  if (titleElement) {
    titleElement.textContent = title
  }

  window.bootstrap?.Modal.getOrCreateInstance(
    document.querySelector('#deleteAdminContentModal'),
  )?.show()
}

function hideDeleteContentModal() {
  window.bootstrap?.Modal.getOrCreateInstance(
    document.querySelector('#deleteAdminContentModal'),
  )?.hide()
}

function ensureAdminListeners() {
  if (adminListenersReady) {
    return
  }

  adminListenersReady = true

  document.addEventListener('change', (event) => {
    const roleSelect = event.target.closest('[data-role-user]')
    const page = adminPageState.root?.querySelector('#admin-page')

    if (!roleSelect || !page?.contains(roleSelect)) {
      return
    }

    const userId = roleSelect.getAttribute('data-role-user')
    const role = roleSelect.value
    const previous = adminPageState.users.find((user) => user.id === userId)?.role

    if (!previous || previous === role) {
      return
    }

    handleRoleChange(userId, role, previous)
  })

  document.addEventListener('click', (event) => {
    const page = adminPageState.root?.querySelector('#admin-page')

    if (!page) {
      return
    }

    const deleteUserButton = event.target.closest('[data-delete-user]')

    if (deleteUserButton && page.contains(deleteUserButton)) {
      showDeleteUserModal(
        deleteUserButton.getAttribute('data-delete-user'),
        deleteUserButton.getAttribute('data-delete-user-label'),
      )
      return
    }

    const deleteContentButton = event.target.closest('[data-delete-content]')

    if (deleteContentButton && page.contains(deleteContentButton)) {
      showDeleteContentModal(
        deleteContentButton.getAttribute('data-delete-content'),
        deleteContentButton.getAttribute('data-delete-content-id'),
        deleteContentButton.getAttribute('data-delete-content-title'),
      )
      return
    }

    if (event.target.closest('#confirm-delete-admin-user')) {
      handleDeleteUser()
    }

    if (event.target.closest('#confirm-delete-admin-content')) {
      handleDeleteContent()
    }
  })

  document.addEventListener('change', (event) => {
    if (event.target?.id === 'admin-content-user-filter') {
      refreshContentPanel(event.target.value)
    }
  })

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'deleteAdminUserModal') {
      adminPageState.pendingDeleteUserId = null
    }

    if (event.target?.id === 'deleteAdminContentModal') {
      adminPageState.pendingDeleteContent = null
    }
  })
}

export function renderAdminPage() {
  return `
    <section class="container py-5" id="admin-page">
      <div class="mb-4">
        <h1 class="h2 mb-2">Admin</h1>
        <p class="text-muted mb-0">Manage users, roles, and watchlist content across the app.</p>
      </div>

      <ul class="nav nav-pills mb-4" id="adminTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button
            class="nav-link active"
            id="users-tab"
            data-bs-toggle="pill"
            data-bs-target="#users-panel"
            type="button"
            role="tab"
          >
            Users
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            id="content-tab"
            data-bs-toggle="pill"
            data-bs-target="#content-panel"
            type="button"
            role="tab"
          >
            Content
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <div class="tab-pane fade show active" id="users-panel" role="tabpanel">
          <div class="card mw-admin-card">
            <div class="card-body p-4">
              <h2 class="h5 mb-3">All users</h2>
              <div id="admin-users-panel">
                ${renderUsersTable([], true)}
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane fade" id="content-panel" role="tabpanel">
          <div class="card mw-admin-card mb-4">
            <div class="card-body p-4">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <h2 class="h5 mb-0">All content</h2>
                <div style="min-width: 14rem;">
                  <label for="admin-content-user-filter" class="form-label small mb-1">Filter by user</label>
                  <select class="form-select form-select-sm" id="admin-content-user-filter">
                    <option value="">All users</option>
                  </select>
                </div>
              </div>

              <h3 class="h6 text-uppercase text-muted mb-3">Movies</h3>
              <div id="admin-movies-panel" class="mb-4">
                <p class="text-muted mb-0">Loading movies…</p>
              </div>

              <h3 class="h6 text-uppercase text-muted mb-3">Series</h3>
              <div id="admin-series-panel">
                <p class="text-muted mb-0">Loading series…</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="deleteAdminUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content mw-modal">
            <div class="modal-header">
              <h2 class="modal-title h5">Delete user?</h2>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">
                Permanently delete <strong id="delete-admin-user-label"></strong> and all of their watchlist data?
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirm-delete-admin-user">Delete user</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="deleteAdminContentModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content mw-modal">
            <div class="modal-header">
              <h2 class="modal-title h5">Delete item?</h2>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">
                Remove <strong id="delete-admin-content-label"></strong> from the watchlist?
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirm-delete-admin-content">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

export async function bindAdminPage(root) {
  ensureAdminListeners()

  const bindId = ++adminPageState.bindId
  adminPageState.root = root

  const [usersResult, moviesResult, seriesResult, genresResult] = await Promise.all([
    getAdminUsers(),
    getAllMovies(),
    getAllSeries(),
    getGenres(),
  ])

  if (bindId !== adminPageState.bindId || !root.querySelector('#admin-page')) {
    return
  }

  if (usersResult.error) {
    toast.error('Could not load users.')
    const panel = root.querySelector('#admin-users-panel')

    if (panel) {
      panel.innerHTML = `
        <div class="alert alert-warning mb-0">
          User list could not be loaded. Check your admin permissions and try again.
        </div>
      `
    }
  } else {
    adminPageState.users = usersResult.users ?? []
    refreshUsersPanel()
  }

  if (moviesResult.error || seriesResult.error) {
    toast.error('Could not load watchlist content.')
  } else {
    adminPageState.movies = moviesResult.movies ?? []
    adminPageState.series = seriesResult.series ?? []
  }

  adminPageState.genres = genresResult.genres ?? []

  const filterSelect = root.querySelector('#admin-content-user-filter')

  if (filterSelect) {
    filterSelect.innerHTML = renderUserFilterOptions(adminPageState.users, '')
  }

  refreshContentPanel()
}
