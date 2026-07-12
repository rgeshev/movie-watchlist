import Sortable from 'sortablejs'
import { getGenres } from '../lib/movies.js'
import {
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  reorderSeries,
} from '../lib/series.js'
import { toast } from '../components/toast.js'

const SERIES_SORTABLE_GROUP = 'series-board'
const EMPTY_COLUMN_MESSAGE = `
  <p class="mw-board-column__empty text-muted mb-0">
    No series here yet. Add one to get started.
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

function mountSeriesModals(root) {
  document
    .querySelectorAll('body > #seriesFormModal, body > #deleteSeriesModal, body > #seriesDetailsModal')
    .forEach((node) => node.remove())

  const seriesModal = root.querySelector('#seriesFormModal')
  const deleteModal = root.querySelector('#deleteSeriesModal')
  const detailsModal = root.querySelector('#seriesDetailsModal')

  if (seriesModal) {
    document.body.appendChild(seriesModal)
  }

  if (deleteModal) {
    document.body.appendChild(deleteModal)
  }

  if (detailsModal) {
    document.body.appendChild(detailsModal)
  }
}

const seriesPageState = {
  bindId: 0,
  root: null,
  series: [],
  genres: [],
  editingSeriesId: null,
  editingSeriesStatus: null,
  pendingDeleteId: null,
}

let seriesListenersReady = false
let sortableInstances = []
let skipNextSeriesCardClick = false

function querySeries(selector) {
  return document.querySelector(selector)
}

function getBoard() {
  return seriesPageState.root?.querySelector('#series-board') ?? null
}

function sortSeriesByPosition(items) {
  return [...items].sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
}

function groupSeriesByStatus(items) {
  const sorted = sortSeriesByPosition(items)

  return {
    want_to_watch: sorted.filter((item) => item.status === 'want_to_watch'),
    watched: sorted.filter((item) => item.status === 'watched'),
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
  const grouped = groupSeriesByStatus(seriesPageState.series)

  Object.entries(grouped).forEach(([status, items]) => {
    const countElement = getBoard()
      ?.querySelector(`[data-board-column="${status}"] [data-column-count]`)

    if (countElement) {
      const label = items.length === 1 ? 'title' : 'titles'
      countElement.textContent = `${items.length} ${label}`
    }
  })
}

function collectBoardUpdates() {
  const updates = []
  const lists = getBoard()?.querySelectorAll('[data-column-list]') ?? []

  lists.forEach((list) => {
    const status = list.getAttribute('data-column-list')
    const cards = list.querySelectorAll('.mw-board-card[data-series-id]')

    cards.forEach((card, index) => {
      updates.push({
        id: card.getAttribute('data-series-id'),
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

function applyBoardUpdates(items, updates) {
  const updateMap = new Map(updates.map((update) => [String(update.id), update]))

  return items.map((item) => {
    const update = updateMap.get(String(item.id))

    if (!update) {
      return item
    }

    return {
      ...item,
      status: update.status,
      position: update.position,
    }
  })
}

function hasBoardOrderChanged(previousItems, updates) {
  const previousMap = new Map(
    previousItems.map((item) => [
      String(item.id),
      { status: item.status, position: item.position ?? 0 },
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

function getChangedBoardUpdates(previousItems, updates) {
  const previousMap = new Map(
    previousItems.map((item) => [
      String(item.id),
      { status: item.status, position: item.position ?? 0 },
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
  const previousItems = [...seriesPageState.series]

  if (!hasBoardOrderChanged(previousItems, updates)) {
    return
  }

  seriesPageState.series = applyBoardUpdates(previousItems, updates)
  updateColumnCounts()

  const changedUpdates = getChangedBoardUpdates(previousItems, updates)
  const { error } = await reorderSeries(changedUpdates)

  if (error) {
    seriesPageState.series = previousItems
    refreshBoard()
    toast.error('Could not save the new order. Please try again.')
    return
  }

  const movedBetweenColumns = event.from !== event.to

  if (movedBetweenColumns) {
    toast.success('Series moved.')
  }
}

function initBoardSortable() {
  destroyBoardSortable()

  const lists = getBoard()?.querySelectorAll('[data-column-list]') ?? []

  lists.forEach((list) => {
    sortableInstances.push(
      Sortable.create(list, {
        group: SERIES_SORTABLE_GROUP,
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
            skipNextSeriesCardClick = true
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
    board.innerHTML = renderBoard(seriesPageState.series)
    initBoardSortable()
  }
}

function populateGenreOptions() {
  const genreSelect = querySeries('#series-genre')

  if (!genreSelect) {
    return
  }

  const options = seriesPageState.genres
    .map(
      (genre) =>
        `<option value="${genre.id}">${escapeHtml(genre.name)}</option>`,
    )
    .join('')

  genreSelect.innerHTML = `<option value="">Select a genre</option>${options}`
}

function resetSeriesForm() {
  seriesPageState.editingSeriesId = null
  seriesPageState.editingSeriesStatus = null

  const seriesForm = querySeries('#series-form')
  const seriesFormTitle = querySeries('#seriesFormModalLabel')
  const seriesFormSubmit = querySeries('#series-form-submit')

  seriesForm?.reset()
  seriesForm?.classList.remove('was-validated')

  if (seriesFormTitle) {
    seriesFormTitle.textContent = 'Add series'
  }

  if (seriesFormSubmit) {
    seriesFormSubmit.textContent = 'Save series'
  }
}

function openAddModal(status = 'want_to_watch') {
  resetSeriesForm()

  const statusField = querySeries('#series-status')
  if (statusField) {
    statusField.value = status
  }

  const statusFieldWrapper = querySeries('#series-status-field')
  if (statusFieldWrapper) {
    statusFieldWrapper.classList.add('d-none')
  }

  showModal(querySeries('#seriesFormModal'))
}

function closeSeriesFormModal() {
  hideModal(querySeries('#seriesFormModal'))
}

function formatDetailValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return escapeHtml(value)
}

function openSeriesDetailsModal(seriesId) {
  const item = seriesPageState.series.find((s) => s.id === seriesId)

  if (!item) {
    toast.error('Could not find that series.')
    return
  }

  const titleElement = querySeries('#seriesDetailsModalLabel')
  const descriptionValue = querySeries('#series-details-description')
  const genreValue = querySeries('#series-details-genre')
  const yearValue = querySeries('#series-details-year')
  const seasonsValue = querySeries('#series-details-seasons')
  const episodesValue = querySeries('#series-details-episodes')
  const statusValue = querySeries('#series-details-status')

  const statusLabel = STATUS_CONFIG[item.status]?.label ?? item.status
  const isWatched = item.status === 'watched'

  if (titleElement) {
    titleElement.textContent = item.title
  }

  if (descriptionValue) {
    descriptionValue.textContent = item.description?.trim() || 'No description provided.'
    descriptionValue.classList.toggle('mw-details-modal__description--empty', !item.description?.trim())
  }

  if (genreValue) {
    genreValue.textContent = item.genres?.name ?? 'Series'
  }

  if (yearValue) {
    const yr = formatDetailValue(item.year)
    yearValue.textContent = yr
    yearValue.hidden = yr === '—'
  }

  if (seasonsValue) {
    const val = item.total_seasons
    seasonsValue.textContent = val ? `${escapeHtml(val)} ${val === 1 ? 'season' : 'seasons'}` : ''
    seasonsValue.hidden = !val
  }

  if (episodesValue) {
    const val = item.total_episodes
    episodesValue.textContent = val ? `${escapeHtml(val)} ${val === 1 ? 'episode' : 'episodes'}` : ''
    episodesValue.hidden = !val
  }

  if (statusValue) {
    statusValue.textContent = statusLabel
    statusValue.className = `mw-details-modal__chip mw-details-modal__chip--status${isWatched ? ' mw-details-modal__chip--watched' : ''}`
  }

  showModal(querySeries('#seriesDetailsModal'))
}

function openEditModal(seriesId) {
  const existing = seriesPageState.series.find((item) => item.id === seriesId)

  if (!existing) {
    toast.error('Could not find that series.')
    return
  }

  resetSeriesForm()
  seriesPageState.editingSeriesId = seriesId
  seriesPageState.editingSeriesStatus = existing.status

  const statusFieldWrapper = querySeries('#series-status-field')
  if (statusFieldWrapper) {
    statusFieldWrapper.classList.remove('d-none')
  }

  const seriesFormTitle = querySeries('#seriesFormModalLabel')
  const seriesFormSubmit = querySeries('#series-form-submit')
  const titleField = querySeries('#series-title')
  const descriptionField = querySeries('#series-description')
  const genreSelect = querySeries('#series-genre')
  const yearField = querySeries('#series-year')
  const totalSeasonsField = querySeries('#series-total-seasons')
  const totalEpisodesField = querySeries('#series-total-episodes')
  const statusField = querySeries('#series-status')

  if (seriesFormTitle) {
    seriesFormTitle.textContent = 'Edit series'
  }

  if (seriesFormSubmit) {
    seriesFormSubmit.textContent = 'Update series'
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

  if (totalSeasonsField) {
    totalSeasonsField.value = existing.total_seasons ?? ''
  }

  if (totalEpisodesField) {
    totalEpisodesField.value = existing.total_episodes ?? ''
  }

  if (statusField) {
    statusField.value = existing.status
  }

  showModal(querySeries('#seriesFormModal'))
}

function getSeriesFormValues() {
  const seriesForm = querySeries('#series-form')
  const formData = new FormData(seriesForm)
  const yearValue = formData.get('year')
  const genreValue = formData.get('genreId')
  const totalSeasonsValue = formData.get('totalSeasons')
  const totalEpisodesValue = formData.get('totalEpisodes')

  return {
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    genreId: genreValue ? Number(genreValue) : null,
    year: yearValue ? Number(yearValue) : null,
    totalSeasons: totalSeasonsValue ? Number(totalSeasonsValue) : null,
    totalEpisodes: totalEpisodesValue ? Number(totalEpisodesValue) : null,
    status: formData.get('status'),
  }
}

async function handleSeriesFormSubmit(event) {
  event.preventDefault()

  const seriesForm = querySeries('#series-form')
  const seriesFormSubmit = querySeries('#series-form-submit')

  if (!seriesForm?.checkValidity()) {
    seriesForm.classList.add('was-validated')
    return
  }

  const values = getSeriesFormValues()
  const isEditing = Boolean(seriesPageState.editingSeriesId)
  const bindId = seriesPageState.bindId

  if (seriesFormSubmit) {
    seriesFormSubmit.disabled = true
    seriesFormSubmit.textContent = isEditing ? 'Updating…' : 'Saving…'
  }

  const result = isEditing
    ? await updateSeries(
        seriesPageState.editingSeriesId,
        values,
        seriesPageState.editingSeriesStatus,
      )
    : await createSeries(values)

  if (seriesFormSubmit) {
    seriesFormSubmit.disabled = false
    seriesFormSubmit.textContent = isEditing ? 'Update series' : 'Save series'
  }

  if (result.error) {
    toast.error(
      isEditing
        ? 'Could not update the series. Please try again.'
        : 'Could not add the series. Please try again.',
    )
    return
  }

  closeSeriesFormModal()

  if (bindId !== seriesPageState.bindId) {
    return
  }

  if (isEditing) {
    seriesPageState.series = seriesPageState.series.map((item) =>
      item.id === result.series.id ? result.series : item,
    )
    toast.success('Series updated.')
  } else {
    seriesPageState.series = [...seriesPageState.series, result.series]
    toast.success('Series added to your watchlist.')
  }

  refreshBoard()
}

function openDeleteModal(seriesId) {
  const item = seriesPageState.series.find((entry) => entry.id === seriesId)
  const deleteTitleElement = querySeries('#delete-series-title')

  if (!item) {
    return
  }

  seriesPageState.pendingDeleteId = seriesId

  if (deleteTitleElement) {
    deleteTitleElement.textContent = item.title
  }

  showModal(querySeries('#deleteSeriesModal'))
}

async function handleDelete() {
  if (!seriesPageState.pendingDeleteId) {
    return
  }

  const seriesId = seriesPageState.pendingDeleteId
  const confirmDeleteButton = querySeries('#confirm-delete-series')
  const bindId = seriesPageState.bindId
  seriesPageState.pendingDeleteId = null

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true
  }

  const { error } = await deleteSeries(seriesId)

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = false
  }

  hideModal(querySeries('#deleteSeriesModal'))

  if (bindId !== seriesPageState.bindId) {
    return
  }

  if (error) {
    toast.error('Could not delete the series. Please try again.')
    return
  }

  seriesPageState.series = seriesPageState.series.filter((item) => item.id !== seriesId)
  refreshBoard()
  toast.success('Series removed from your watchlist.')
}

function ensureSeriesListeners() {
  if (seriesListenersReady) {
    return
  }

  seriesListenersReady = true

  document.addEventListener('click', (event) => {
    const page = seriesPageState.root?.querySelector('#series-page')

    if (!page) {
      return
    }

    const addButton = event.target.closest('[data-add-series]')
    if (addButton && page.contains(addButton)) {
      openAddModal(addButton.getAttribute('data-add-series'))
      return
    }

    const editButton = event.target.closest('[data-edit-series]')
    if (editButton && page.contains(editButton)) {
      openEditModal(editButton.getAttribute('data-edit-series'))
      return
    }

    const deleteButton = event.target.closest('[data-delete-series]')
    if (deleteButton && page.contains(deleteButton)) {
      openDeleteModal(deleteButton.getAttribute('data-delete-series'))
      return
    }

    if (event.target.closest('#confirm-delete-series')) {
      handleDelete()
      return
    }

    if (skipNextSeriesCardClick) {
      skipNextSeriesCardClick = false
      return
    }

    const seriesCard = event.target.closest('.mw-board-card[data-series-id]')
    if (seriesCard && page.contains(seriesCard) && !event.target.closest('.mw-poster-card__action')) {
      openSeriesDetailsModal(seriesCard.getAttribute('data-series-id'))
    }
  })

  document.addEventListener('submit', (event) => {
    if (event.target instanceof HTMLFormElement && event.target.id === 'series-form') {
      handleSeriesFormSubmit(event)
    }
  })

  document.addEventListener('keydown', (event) => {
    const page = seriesPageState.root?.querySelector('#series-page')

    if (!page || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    const viewTarget = event.target.closest('[data-view-series]')

    if (!viewTarget || !page.contains(viewTarget)) {
      return
    }

    event.preventDefault()
    openSeriesDetailsModal(viewTarget.getAttribute('data-view-series'))
  })

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'seriesFormModal') {
      resetSeriesForm()
    }

    if (event.target?.id === 'deleteSeriesModal') {
      seriesPageState.pendingDeleteId = null
    }
  })
}

const STATUS_CONFIG = {
  want_to_watch: {
    label: 'Want to Watch',
  },
  watched: {
    label: 'Watched',
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

function formatSeriesMeta(year, totalSeasons, totalEpisodes) {
  const parts = []

  if (year) {
    parts.push(escapeHtml(year))
  }

  if (totalSeasons) {
    const label = totalSeasons === 1 ? 'season' : 'seasons'
    parts.push(`${escapeHtml(totalSeasons)} ${label}`)
  }

  if (totalEpisodes) {
    const label = totalEpisodes === 1 ? 'episode' : 'episodes'
    parts.push(`${escapeHtml(totalEpisodes)} ${label}`)
  }

  return parts.join(' · ')
}

function renderSeriesCard(item) {
  const genre = escapeHtml(item.genres?.name ?? 'Series')
  const title = escapeHtml(item.title)
  const meta = formatSeriesMeta(item.year, item.total_seasons, item.total_episodes)

  return `
    <article class="mw-poster-card mw-board-card" data-series-id="${item.id}">
      <div class="mw-poster-card__body mw-board-card__view" data-view-series="${item.id}" role="button" tabindex="0" aria-label="View details for ${title}">
        <div class="mw-poster-card__info">
          <span class="mw-poster-card__genre">${genre}</span>
          <h3 class="mw-poster-card__title" title="${title}">${title}</h3>
          ${meta ? `<span class="mw-poster-card__year">${meta}</span>` : ''}
        </div>
      </div>
      <div class="mw-poster-card__actions">
        <button
          type="button"
          class="btn btn-sm btn-accent mw-poster-card__action"
          data-edit-series="${item.id}"
          aria-label="Edit ${title}"
          title="Edit"
        >
          &#9998;
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-light mw-poster-card__action"
          data-delete-series="${item.id}"
          aria-label="Delete ${title}"
          title="Delete"
        >
          &#128465;
        </button>
      </div>
    </article>
  `
}

function renderBoardColumn(status, items, loading) {
  const config = STATUS_CONFIG[status]

  const cards = loading
    ? `
      <div class="mw-board-column__placeholder" aria-hidden="true"></div>
      <div class="mw-board-column__placeholder" aria-hidden="true"></div>
      <div class="mw-board-column__placeholder" aria-hidden="true"></div>
    `
    : items.length
      ? items.map(renderSeriesCard).join('')
      : `
        <p class="mw-board-column__empty text-muted mb-0">
          No series here yet. Add one to get started.
        </p>
      `

  return `
    <div class="col-12 col-lg-6">
      <div class="mw-board-column" data-board-column="${status}">
        <div class="mw-board-column__header">
          <div>
            <h2 class="mw-board-column__title">${config.label}</h2>
            <p class="mw-board-column__count text-muted mb-0" data-column-count>
              ${loading ? '&mdash;' : `${items.length} ${items.length === 1 ? 'title' : 'titles'}`}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-accent btn-sm"
            data-add-series="${status}"
          >
            + Add Series
          </button>
        </div>
        <div class="mw-board-column__list" data-column-list="${status}">
          ${cards}
        </div>
      </div>
    </div>
  `
}

export function renderSeriesPage() {
  return `
    <section class="container py-5" id="series-page">
      <div class="mw-board__intro mb-4">
        <h1 class="h2 mb-2">Series</h1>
        <p class="text-muted mb-0">
          Organize your TV watchlist. Drag cards between columns or reorder within a column.
        </p>
      </div>

      <div class="mw-board-viewport">
        <div class="row g-4 mw-board" id="series-board">
          ${renderBoardColumn('want_to_watch', [], true)}
          ${renderBoardColumn('watched', [], true)}
        </div>
      </div>

      <div class="modal fade" id="seriesDetailsModal" tabindex="-1" aria-labelledby="seriesDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-md">
          <div class="modal-content mw-modal mw-details-modal">
            <div class="mw-details-modal__header">
              <button type="button" class="btn-close btn-close-white mw-details-modal__close" data-bs-dismiss="modal" aria-label="Close"></button>
              <p class="mw-details-modal__eyebrow" id="series-details-genre"></p>
              <h2 class="mw-details-modal__title" id="seriesDetailsModalLabel"></h2>
              <div class="mw-details-modal__meta">
                <span class="mw-details-modal__chip" id="series-details-year"></span>
                <span class="mw-details-modal__chip" id="series-details-seasons"></span>
                <span class="mw-details-modal__chip" id="series-details-episodes"></span>
                <span class="mw-details-modal__chip mw-details-modal__chip--status" id="series-details-status"></span>
              </div>
            </div>
            <div class="modal-body mw-details-modal__body">
              <p class="mw-details-modal__description" id="series-details-description"></p>
            </div>
            <div class="modal-footer mw-details-modal__footer">
              <button type="button" class="btn btn-outline-light btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="deleteSeriesModal" tabindex="-1" aria-labelledby="deleteSeriesModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content mw-modal">
            <div class="modal-header">
              <h2 class="modal-title h5" id="deleteSeriesModalLabel">Delete series?</h2>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">
                Remove <strong id="delete-series-title"></strong> from your watchlist? This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirm-delete-series">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="seriesFormModal" tabindex="-1" aria-labelledby="seriesFormModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content mw-modal">
            <form id="series-form" novalidate>
              <div class="modal-header">
                <h2 class="modal-title h5" id="seriesFormModalLabel">Add series</h2>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-12">
                    <label for="series-title" class="form-label">Title</label>
                    <input
                      type="text"
                      class="form-control"
                      id="series-title"
                      name="title"
                      required
                      maxlength="200"
                    />
                    <div class="invalid-feedback">Title is required.</div>
                  </div>
                  <div class="col-12">
                    <label for="series-description" class="form-label">Description</label>
                    <textarea
                      class="form-control"
                      id="series-description"
                      name="description"
                      rows="3"
                      maxlength="2000"
                      placeholder="Optional notes about this show"
                    ></textarea>
                  </div>
                  <div class="col-sm-6">
                    <label for="series-genre" class="form-label">Genre</label>
                    <select class="form-select" id="series-genre" name="genreId">
                      <option value="">Select a genre</option>
                    </select>
                  </div>
                  <div class="col-sm-6">
                    <label for="series-year" class="form-label">Year</label>
                    <input
                      type="number"
                      class="form-control"
                      id="series-year"
                      name="year"
                      min="1888"
                      max="2100"
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div class="col-sm-6">
                    <label for="series-total-seasons" class="form-label">Total Seasons</label>
                    <input
                      type="number"
                      class="form-control"
                      id="series-total-seasons"
                      name="totalSeasons"
                      min="1"
                      max="100"
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div class="col-sm-6">
                    <label for="series-total-episodes" class="form-label">Total Episodes</label>
                    <input
                      type="number"
                      class="form-control"
                      id="series-total-episodes"
                      name="totalEpisodes"
                      min="1"
                      max="10000"
                      placeholder="e.g. 24"
                    />
                  </div>
                  <div class="col-12" id="series-status-field">
                    <label for="series-status" class="form-label">Status</label>
                    <select class="form-select" id="series-status" name="status" required>
                      <option value="want_to_watch">Want to Watch</option>
                      <option value="watched">Watched</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-accent" id="series-form-submit">Save series</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `
}

function renderBoard(items, loading = false) {
  const grouped = groupSeriesByStatus(items)

  return `
    ${renderBoardColumn('want_to_watch', grouped.want_to_watch, loading)}
    ${renderBoardColumn('watched', grouped.watched, loading)}
  `
}

export async function bindSeriesPage(root) {
  ensureSeriesListeners()
  destroyBoardSortable()

  const bindId = ++seriesPageState.bindId
  seriesPageState.root = root
  seriesPageState.pendingDeleteId = null
  seriesPageState.editingSeriesId = null
  seriesPageState.editingSeriesStatus = null

  mountSeriesModals(root)

  const [{ series: fetchedSeries, error }, { genres: fetchedGenres, error: genresError }] =
    await Promise.all([getSeries(), getGenres()])

  if (bindId !== seriesPageState.bindId || !root.querySelector('#series-page')) {
    return
  }

  if (genresError) {
    toast.error('Could not load genres.')
  } else {
    seriesPageState.genres = fetchedGenres ?? []
    populateGenreOptions()
  }

  if (error) {
    toast.error('Could not load your series.')

    const board = getBoard()
    if (board) {
      board.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning mb-0">
            Your series watchlist could not be loaded. Check your connection and try again.
          </div>
        </div>
      `
    }

    return
  }

  seriesPageState.series = fetchedSeries ?? []
  refreshBoard()
}
