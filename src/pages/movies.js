import Sortable from 'sortablejs'
import {
  getMovies,
  getGenres,
  createMovie,
  updateMovie,
  deleteMovie,
  reorderMovies,
} from '../lib/movies.js'
import { toast } from '../components/toast.js'

const MOVIES_SORTABLE_GROUP = 'movies-board'
const EMPTY_COLUMN_MESSAGE = `
  <p class="mw-board-column__empty text-muted mb-0">
    No movies here yet. Add one to get started.
  </p>
`

function getBootstrapModal(element) {
  if (!element || !window.bootstrap?.Modal) {
    return null
  }

  return window.bootstrap.Modal.getOrCreateInstance(element)
}

function cleanupModalArtifacts() {
  document.body.classList.remove('modal-open')
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove())
}

function showModal(element) {
  if (!element) {
    return
  }

  cleanupModalArtifacts()
  element.style.removeProperty('display')

  const modal = getBootstrapModal(element)
  modal?.show()
}

function hideModal(element) {
  const modal = getBootstrapModal(element)

  if (modal) {
    modal.hide()
    return
  }

  if (!element) {
    return
  }

  element.classList.remove('show')
  element.style.display = 'none'
  element.setAttribute('aria-hidden', 'true')
  element.removeAttribute('aria-modal')
  element.removeAttribute('role')
  cleanupModalArtifacts()
}

function mountMoviesModals(root) {
  document
    .querySelectorAll('body > #movieFormModal, body > #deleteMovieModal, body > #movieDetailsModal')
    .forEach((node) => node.remove())

  const movieModal = root.querySelector('#movieFormModal')
  const deleteModal = root.querySelector('#deleteMovieModal')
  const detailsModal = root.querySelector('#movieDetailsModal')

  if (movieModal) {
    document.body.appendChild(movieModal)
  }

  if (deleteModal) {
    document.body.appendChild(deleteModal)
  }

  if (detailsModal) {
    document.body.appendChild(detailsModal)
  }
}

const moviesPageState = {
  bindId: 0,
  root: null,
  movies: [],
  genres: [],
  editingMovieId: null,
  editingMovieStatus: null,
  pendingDeleteId: null,
}

let moviesListenersReady = false
let sortableInstances = []
let skipNextMovieCardClick = false

function queryMovies(selector) {
  return document.querySelector(selector)
}

function getBoard() {
  return moviesPageState.root?.querySelector('#movies-board') ?? null
}

function sortMoviesByPosition(movies) {
  return [...movies].sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
}

function groupMoviesByStatus(movies) {
  const sorted = sortMoviesByPosition(movies)

  return {
    want_to_watch: sorted.filter((movie) => movie.status === 'want_to_watch'),
    watched: sorted.filter((movie) => movie.status === 'watched'),
  }
}

function destroyBoardSortable() {
  sortableInstances.forEach((instance) => instance.destroy())
  sortableInstances = []
}

function syncEmptyColumnStates() {
  const lists = getBoard()?.querySelectorAll('[data-column-list]') ?? []

  lists.forEach((list) => {
    const hasCards = list.querySelector('.mw-board-card')
    const emptyElement = list.querySelector('.mw-board-column__empty')

    if (hasCards && emptyElement) {
      emptyElement.remove()
      return
    }

    if (!hasCards && !emptyElement) {
      list.insertAdjacentHTML('beforeend', EMPTY_COLUMN_MESSAGE)
    }
  })
}

function updateColumnCounts() {
  const grouped = groupMoviesByStatus(moviesPageState.movies)

  Object.entries(grouped).forEach(([status, movies]) => {
    const countElement = getBoard()
      ?.querySelector(`[data-board-column="${status}"] [data-column-count]`)

    if (countElement) {
      const label = movies.length === 1 ? 'title' : 'titles'
      countElement.textContent = `${movies.length} ${label}`
    }
  })
}

function collectBoardUpdates() {
  const updates = []
  const lists = getBoard()?.querySelectorAll('[data-column-list]') ?? []

  lists.forEach((list) => {
    const status = list.getAttribute('data-column-list')
    const cards = list.querySelectorAll('.mw-board-card[data-movie-id]')

    cards.forEach((card, index) => {
      updates.push({
        id: card.getAttribute('data-movie-id'),
        status,
        position: index,
      })
    })
  })

  return updates
}

function clearBoardDragHighlights() {
  getBoard()
    ?.querySelectorAll('[data-column-list]')
    .forEach((list) => list.classList.remove('mw-board-column__list--drag-over'))
}

function applyBoardUpdates(movies, updates) {
  const updateMap = new Map(updates.map((update) => [String(update.id), update]))

  return movies.map((movie) => {
    const update = updateMap.get(String(movie.id))

    if (!update) {
      return movie
    }

    return {
      ...movie,
      status: update.status,
      position: update.position,
    }
  })
}

function hasBoardOrderChanged(previousMovies, updates) {
  const previousMap = new Map(
    previousMovies.map((movie) => [
      String(movie.id),
      { status: movie.status, position: movie.position ?? 0 },
    ]),
  )

  return updates.some((update) => {
    const previous = previousMap.get(String(update.id))

    return (
      !previous ||
      previous.status !== update.status ||
      previous.position !== update.position
    )
  })
}

function getChangedBoardUpdates(previousMovies, updates) {
  const previousMap = new Map(
    previousMovies.map((movie) => [
      String(movie.id),
      { status: movie.status, position: movie.position ?? 0 },
    ]),
  )

  return updates.filter((update) => {
    const previous = previousMap.get(String(update.id))

    return (
      !previous ||
      previous.status !== update.status ||
      previous.position !== update.position
    )
  })
}

async function handleBoardSortEnd(event) {
  if (event.from === event.to && event.oldIndex === event.newIndex) {
    return
  }

  syncEmptyColumnStates()

  const updates = collectBoardUpdates()
  const previousMovies = [...moviesPageState.movies]

  if (!hasBoardOrderChanged(previousMovies, updates)) {
    return
  }

  moviesPageState.movies = applyBoardUpdates(previousMovies, updates)
  updateColumnCounts()

  const changedUpdates = getChangedBoardUpdates(previousMovies, updates)
  const { error } = await reorderMovies(changedUpdates)

  if (error) {
    moviesPageState.movies = previousMovies
    refreshBoard()
    toast.error('Could not save the new order. Please try again.')
    return
  }

  const movedBetweenColumns = event.from !== event.to

  if (movedBetweenColumns) {
    toast.success('Movie moved.')
  }
}

function initBoardSortable() {
  destroyBoardSortable()

  const lists = getBoard()?.querySelectorAll('[data-column-list]') ?? []

  lists.forEach((list) => {
    sortableInstances.push(
      Sortable.create(list, {
        group: MOVIES_SORTABLE_GROUP,
        animation: 180,
        draggable: '.mw-board-card',
        ghostClass: 'mw-board-card--ghost',
        chosenClass: 'mw-board-card--chosen',
        dragClass: 'mw-board-card--drag',
        filter: '.mw-poster-card__action',
        preventOnFilter: true,
        emptyInsertThreshold: 24,
        onStart(event) {
          clearBoardDragHighlights()
          event.from.classList.add('mw-board-column__list--drag-over')
        },
        onMove(event) {
          clearBoardDragHighlights()
          event.to.classList.add('mw-board-column__list--drag-over')
          return true
        },
        onEnd(event) {
          clearBoardDragHighlights()
          if (event.oldIndex !== event.newIndex || event.from !== event.to) {
            skipNextMovieCardClick = true
          }
          handleBoardSortEnd(event)
        },
        onAdd() {
          syncEmptyColumnStates()
        },
        onRemove() {
          syncEmptyColumnStates()
        },
      }),
    )
  })
}

function refreshBoard() {
  const board = getBoard()

  if (board) {
    board.innerHTML = renderBoard(moviesPageState.movies)
    initBoardSortable()
  }
}

function populateGenreOptions() {
  const genreSelect = queryMovies('#movie-genre')

  if (!genreSelect) {
    return
  }

  const options = moviesPageState.genres
    .map(
      (genre) =>
        `<option value="${genre.id}">${escapeHtml(genre.name)}</option>`,
    )
    .join('')

  genreSelect.innerHTML = `<option value="">Select a genre</option>${options}`
}

function resetMovieForm() {
  moviesPageState.editingMovieId = null
  moviesPageState.editingMovieStatus = null

  const movieForm = queryMovies('#movie-form')
  const movieFormTitle = queryMovies('#movieFormModalLabel')
  const movieFormSubmit = queryMovies('#movie-form-submit')

  movieForm?.reset()
  movieForm?.classList.remove('was-validated')

  if (movieFormTitle) {
    movieFormTitle.textContent = 'Add movie'
  }

  if (movieFormSubmit) {
    movieFormSubmit.textContent = 'Save movie'
  }
}

function openAddModal(status = 'want_to_watch') {
  resetMovieForm()

  const statusField = queryMovies('#movie-status')
  if (statusField) {
    statusField.value = status
  }

  const statusFieldWrapper = queryMovies('#movie-status-field')
  if (statusFieldWrapper) {
    statusFieldWrapper.classList.add('d-none')
  }

  showModal(queryMovies('#movieFormModal'))
}

function closeMovieFormModal() {
  hideModal(queryMovies('#movieFormModal'))
}

function formatDetailValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return escapeHtml(value)
}

function openDetailsModal(movieId) {
  const movie = moviesPageState.movies.find((item) => item.id === movieId)

  if (!movie) {
    toast.error('Could not find that movie.')
    return
  }

  const titleElement = queryMovies('#movieDetailsModalLabel')
  const descriptionValue = queryMovies('#movie-details-description')
  const genreValue = queryMovies('#movie-details-genre')
  const yearValue = queryMovies('#movie-details-year')
  const statusValue = queryMovies('#movie-details-status')

  const statusLabel = STATUS_CONFIG[movie.status]?.label ?? movie.status
  const isWatched = movie.status === 'watched'

  if (titleElement) {
    titleElement.textContent = movie.title
  }

  if (descriptionValue) {
    descriptionValue.textContent = movie.description?.trim() || 'No description provided.'
    descriptionValue.classList.toggle('mw-details-modal__description--empty', !movie.description?.trim())
  }

  if (genreValue) {
    genreValue.textContent = movie.genres?.name ?? 'Film'
  }

  if (yearValue) {
    const yr = formatDetailValue(movie.year)
    yearValue.textContent = yr
    yearValue.hidden = yr === '—'
  }

  if (statusValue) {
    statusValue.textContent = statusLabel
    statusValue.className = `mw-details-modal__chip mw-details-modal__chip--status${isWatched ? ' mw-details-modal__chip--watched' : ''}`
  }

  showModal(queryMovies('#movieDetailsModal'))
}

function openEditModal(movieId) {
  const existing = moviesPageState.movies.find((item) => item.id === movieId)

  if (!existing) {
    toast.error('Could not find that movie.')
    return
  }

  resetMovieForm()
  moviesPageState.editingMovieId = movieId
  moviesPageState.editingMovieStatus = existing.status

  const statusFieldWrapper = queryMovies('#movie-status-field')
  if (statusFieldWrapper) {
    statusFieldWrapper.classList.remove('d-none')
  }

  const movieFormTitle = queryMovies('#movieFormModalLabel')
  const movieFormSubmit = queryMovies('#movie-form-submit')
  const titleField = queryMovies('#movie-title')
  const descriptionField = queryMovies('#movie-description')
  const genreSelect = queryMovies('#movie-genre')
  const yearField = queryMovies('#movie-year')
  const statusField = queryMovies('#movie-status')

  if (movieFormTitle) {
    movieFormTitle.textContent = 'Edit movie'
  }

  if (movieFormSubmit) {
    movieFormSubmit.textContent = 'Update movie'
  }

  if (titleField) {
    titleField.value = existing.title
  }

  if (descriptionField) {
    descriptionField.value = existing.description ?? ''
  }

  if (genreSelect) {
    genreSelect.value = existing.genre_id ?? ''
  }

  if (yearField) {
    yearField.value = existing.year ?? ''
  }

  if (statusField) {
    statusField.value = existing.status
  }

  showModal(queryMovies('#movieFormModal'))
}

function getMovieFormValues() {
  const movieForm = queryMovies('#movie-form')
  const formData = new FormData(movieForm)
  const yearValue = formData.get('year')
  const genreValue = formData.get('genreId')

  return {
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    genreId: genreValue ? Number(genreValue) : null,
    year: yearValue ? Number(yearValue) : null,
    status: formData.get('status'),
  }
}

async function handleMovieFormSubmit(event) {
  event.preventDefault()

  const movieForm = queryMovies('#movie-form')
  const movieFormSubmit = queryMovies('#movie-form-submit')

  if (!movieForm?.checkValidity()) {
    movieForm.classList.add('was-validated')
    return
  }

  const values = getMovieFormValues()
  const isEditing = Boolean(moviesPageState.editingMovieId)
  const bindId = moviesPageState.bindId

  if (movieFormSubmit) {
    movieFormSubmit.disabled = true
    movieFormSubmit.textContent = isEditing ? 'Updating…' : 'Saving…'
  }

  const result = isEditing
    ? await updateMovie(
        moviesPageState.editingMovieId,
        values,
        moviesPageState.editingMovieStatus,
      )
    : await createMovie(values)

  if (movieFormSubmit) {
    movieFormSubmit.disabled = false
    movieFormSubmit.textContent = isEditing ? 'Update movie' : 'Save movie'
  }

  if (result.error) {
    toast.error(
      isEditing
        ? 'Could not update the movie. Please try again.'
        : 'Could not add the movie. Please try again.',
    )
    return
  }

  closeMovieFormModal()

  if (bindId !== moviesPageState.bindId) {
    return
  }

  if (isEditing) {
    moviesPageState.movies = moviesPageState.movies.map((movie) =>
      movie.id === result.movie.id ? result.movie : movie,
    )
    toast.success('Movie updated.')
  } else {
    moviesPageState.movies = [...moviesPageState.movies, result.movie]
    toast.success('Movie added to your watchlist.')
  }

  refreshBoard()
}

function openDeleteModal(movieId) {
  const movie = moviesPageState.movies.find((item) => item.id === movieId)
  const deleteTitleElement = queryMovies('#delete-movie-title')

  if (!movie) {
    return
  }

  moviesPageState.pendingDeleteId = movieId

  if (deleteTitleElement) {
    deleteTitleElement.textContent = movie.title
  }

  showModal(queryMovies('#deleteMovieModal'))
}

async function handleDelete() {
  if (!moviesPageState.pendingDeleteId) {
    return
  }

  const movieId = moviesPageState.pendingDeleteId
  const confirmDeleteButton = queryMovies('#confirm-delete-movie')
  const bindId = moviesPageState.bindId
  moviesPageState.pendingDeleteId = null

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true
  }

  const { error } = await deleteMovie(movieId)

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = false
  }

  hideModal(queryMovies('#deleteMovieModal'))

  if (bindId !== moviesPageState.bindId) {
    return
  }

  if (error) {
    toast.error('Could not delete the movie. Please try again.')
    return
  }

  moviesPageState.movies = moviesPageState.movies.filter(
    (movie) => movie.id !== movieId,
  )
  refreshBoard()
  toast.success('Movie removed from your watchlist.')
}

function ensureMoviesListeners() {
  if (moviesListenersReady) {
    return
  }

  moviesListenersReady = true

  document.addEventListener('click', (event) => {
    const page = moviesPageState.root?.querySelector('#movies-page')

    if (!page) {
      return
    }

    const addButton = event.target.closest('[data-add-movie]')
    if (addButton && page.contains(addButton)) {
      openAddModal(addButton.getAttribute('data-add-movie'))
      return
    }

    const editButton = event.target.closest('[data-edit-movie]')
    if (editButton && page.contains(editButton)) {
      openEditModal(editButton.getAttribute('data-edit-movie'))
      return
    }

    const deleteButton = event.target.closest('[data-delete-movie]')
    if (deleteButton && page.contains(deleteButton)) {
      openDeleteModal(deleteButton.getAttribute('data-delete-movie'))
      return
    }

    if (skipNextMovieCardClick) {
      skipNextMovieCardClick = false
      return
    }

    const movieCard = event.target.closest('.mw-board-card[data-movie-id]')
    if (movieCard && page.contains(movieCard) && !event.target.closest('.mw-poster-card__action')) {
      openDetailsModal(movieCard.getAttribute('data-movie-id'))
      return
    }

    if (event.target.closest('#confirm-delete-movie')) {
      handleDelete()
    }
  })

  document.addEventListener('submit', (event) => {
    if (event.target instanceof HTMLFormElement && event.target.id === 'movie-form') {
      handleMovieFormSubmit(event)
    }
  })

  document.addEventListener('keydown', (event) => {
    const page = moviesPageState.root?.querySelector('#movies-page')

    if (!page || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    const viewTarget = event.target.closest('[data-view-movie]')

    if (!viewTarget || !page.contains(viewTarget)) {
      return
    }

    event.preventDefault()
    openDetailsModal(viewTarget.getAttribute('data-view-movie'))
  })

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'movieFormModal') {
      resetMovieForm()
    }

    if (event.target?.id === 'deleteMovieModal') {
      moviesPageState.pendingDeleteId = null
    }
  })
}

const STATUS_CONFIG = {
  want_to_watch: {
    label: 'Want to Watch',
    badgeClass: 'want-to-watch',
    badgeLabel: 'Watchlist',
  },
  watched: {
    label: 'Watched',
    badgeClass: 'watched',
    badgeLabel: 'Watched',
  },
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderMovieCard(movie) {
  const genre = escapeHtml(movie.genres?.name ?? 'Film')
  const title = escapeHtml(movie.title)
  const year = movie.year ? escapeHtml(movie.year) : ''

  return `
    <article class="mw-poster-card mw-board-card" data-movie-id="${movie.id}">
      <div class="mw-poster-card__body mw-board-card__view" data-view-movie="${movie.id}" role="button" tabindex="0" aria-label="View details for ${title}">
        <div class="mw-poster-card__info">
          <span class="mw-poster-card__genre">${genre}</span>
          <h3 class="mw-poster-card__title" title="${title}">${title}</h3>
          ${year ? `<span class="mw-poster-card__year">${year}</span>` : ''}
        </div>
      </div>
      <div class="mw-poster-card__actions">
        <button
          type="button"
          class="btn btn-sm btn-accent mw-poster-card__action"
          data-edit-movie="${movie.id}"
          aria-label="Edit ${title}"
          title="Edit"
        >
          &#9998;
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-light mw-poster-card__action"
          data-delete-movie="${movie.id}"
          aria-label="Delete ${title}"
          title="Delete"
        >
          &#128465;
        </button>
      </div>
    </article>
  `
}

function renderBoardColumn(status, movies, loading) {
  const config = STATUS_CONFIG[status]

  const cards = loading
    ? `
      <div class="mw-board-column__placeholder" aria-hidden="true"></div>
      <div class="mw-board-column__placeholder" aria-hidden="true"></div>
      <div class="mw-board-column__placeholder" aria-hidden="true"></div>
    `
    : movies.length
      ? movies.map(renderMovieCard).join('')
      : `
        <p class="mw-board-column__empty text-muted mb-0">
          No movies here yet. Add one to get started.
        </p>
      `

  return `
    <div class="col-12 col-lg-6">
      <div class="mw-board-column" data-board-column="${status}">
        <div class="mw-board-column__header">
          <div>
            <h2 class="mw-board-column__title">${config.label}</h2>
            <p class="mw-board-column__count text-muted mb-0" data-column-count>
              ${loading ? '&mdash;' : `${movies.length} ${movies.length === 1 ? 'title' : 'titles'}`}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-accent btn-sm"
            data-add-movie="${status}"
          >
            + Add Movie
          </button>
        </div>
        <div class="mw-board-column__list" data-column-list="${status}">
          ${cards}
        </div>
      </div>
    </div>
  `
}

export function renderMoviesPage() {
  return `
    <section class="container py-5" id="movies-page">
      <div class="mw-board__intro mb-4">
        <h1 class="h2 mb-2">Movies</h1>
        <p class="text-muted mb-0">
          Organize your film watchlist. Drag cards between columns or reorder within a column.
        </p>
      </div>

      <div class="mw-board-viewport">
        <div class="row g-4 mw-board" id="movies-board">
          ${renderBoardColumn('want_to_watch', [], true)}
          ${renderBoardColumn('watched', [], true)}
        </div>
      </div>

      <div class="modal fade" id="deleteMovieModal" tabindex="-1" aria-labelledby="deleteMovieModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content mw-modal">
            <div class="modal-header">
              <h2 class="modal-title h5" id="deleteMovieModalLabel">Delete movie?</h2>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">
                Remove <strong id="delete-movie-title"></strong> from your watchlist? This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirm-delete-movie">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="movieDetailsModal" tabindex="-1" aria-labelledby="movieDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-md">
          <div class="modal-content mw-modal mw-details-modal">
            <div class="mw-details-modal__header">
              <button type="button" class="btn-close btn-close-white mw-details-modal__close" data-bs-dismiss="modal" aria-label="Close"></button>
              <p class="mw-details-modal__eyebrow" id="movie-details-genre"></p>
              <h2 class="mw-details-modal__title" id="movieDetailsModalLabel"></h2>
              <div class="mw-details-modal__meta">
                <span class="mw-details-modal__chip" id="movie-details-year"></span>
                <span class="mw-details-modal__chip mw-details-modal__chip--status" id="movie-details-status"></span>
              </div>
            </div>
            <div class="modal-body mw-details-modal__body">
              <p class="mw-details-modal__description" id="movie-details-description"></p>
            </div>
            <div class="modal-footer mw-details-modal__footer">
              <button type="button" class="btn btn-outline-light btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="movieFormModal" tabindex="-1" aria-labelledby="movieFormModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content mw-modal">
            <form id="movie-form" novalidate>
              <div class="modal-header">
                <h2 class="modal-title h5" id="movieFormModalLabel">Add movie</h2>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-12">
                    <label for="movie-title" class="form-label">Title</label>
                    <input
                      type="text"
                      class="form-control"
                      id="movie-title"
                      name="title"
                      required
                      maxlength="200"
                    />
                    <div class="invalid-feedback">Title is required.</div>
                  </div>
                  <div class="col-12">
                    <label for="movie-description" class="form-label">Description</label>
                    <textarea
                      class="form-control"
                      id="movie-description"
                      name="description"
                      rows="3"
                      maxlength="2000"
                      placeholder="Optional notes about this film"
                    ></textarea>
                  </div>
                  <div class="col-sm-6">
                    <label for="movie-genre" class="form-label">Genre</label>
                    <select class="form-select" id="movie-genre" name="genreId">
                      <option value="">Select a genre</option>
                    </select>
                  </div>
                  <div class="col-sm-6">
                    <label for="movie-year" class="form-label">Year</label>
                    <input
                      type="number"
                      class="form-control"
                      id="movie-year"
                      name="year"
                      min="1888"
                      max="2100"
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div class="col-12" id="movie-status-field">
                    <label for="movie-status" class="form-label">Status</label>
                    <select class="form-select" id="movie-status" name="status" required>
                      <option value="want_to_watch">Want to Watch</option>
                      <option value="watched">Watched</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-accent" id="movie-form-submit">Save movie</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `
}

function renderBoard(movies, loading = false) {
  const grouped = groupMoviesByStatus(movies)

  return `
    ${renderBoardColumn('want_to_watch', grouped.want_to_watch, loading)}
    ${renderBoardColumn('watched', grouped.watched, loading)}
  `
}

export async function bindMoviesPage(root) {
  ensureMoviesListeners()
  destroyBoardSortable()

  const bindId = ++moviesPageState.bindId
  moviesPageState.root = root
  moviesPageState.pendingDeleteId = null
  moviesPageState.editingMovieId = null
  moviesPageState.editingMovieStatus = null

  mountMoviesModals(root)

  const [{ movies: fetchedMovies, error }, { genres: fetchedGenres, error: genresError }] =
    await Promise.all([getMovies(), getGenres()])

  if (bindId !== moviesPageState.bindId || !root.querySelector('#movies-page')) {
    return
  }

  if (genresError) {
    toast.error('Could not load genres.')
  } else {
    moviesPageState.genres = fetchedGenres ?? []
    populateGenreOptions()
  }

  if (error) {
    toast.error('Could not load your movies.')

    const board = getBoard()
    if (board) {
      board.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning mb-0">
            Your movie watchlist could not be loaded. Check your connection and try again.
          </div>
        </div>
      `
    }

    return
  }

  moviesPageState.movies = fetchedMovies ?? []
  refreshBoard()
}
