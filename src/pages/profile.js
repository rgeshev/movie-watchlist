import { getUser, getProfile, refreshProfile } from '../lib/auth.js'
import { updateProfile } from '../lib/profile.js'
import { toast } from '../components/toast.js'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getAvatarInitials(username, email) {
  const source = username || email || '?'
  return source.charAt(0).toUpperCase()
}

function renderAvatarPreview(avatarUrl, username, email) {
  if (avatarUrl) {
    return `
      <img
        id="profile-avatar-img"
        src="${escapeHtml(avatarUrl)}"
        alt="Avatar"
        class="mw-profile-avatar mw-profile-avatar--img"
        onerror="this.style.display='none'; document.getElementById('profile-avatar-initials').style.display='flex';"
      />
      <div
        id="profile-avatar-initials"
        class="mw-profile-avatar mw-profile-avatar--initials"
        style="display:none;"
        aria-hidden="true"
      >
        ${escapeHtml(getAvatarInitials(username, email))}
      </div>
    `
  }

  return `
    <div
      id="profile-avatar-initials"
      class="mw-profile-avatar mw-profile-avatar--initials"
      aria-hidden="true"
    >
      ${escapeHtml(getAvatarInitials(username, email))}
    </div>
  `
}

export function renderProfilePage() {
  const user = getUser()
  const profile = getProfile()

  const username = profile?.username || ''
  const avatarUrl = profile?.avatar_url || ''
  const email = user?.email || ''
  const memberSince = formatDate(profile?.created_at || user?.created_at)

  return `
    <section class="container py-5" id="profile-page">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">

          <div class="mb-5">
            <h1 class="h2 mb-1">Profile</h1>
            <p class="text-muted mb-0">Update your display name and avatar.</p>
          </div>

          <div class="card mw-profile-card mb-4">
            <div class="card-body p-4">

              <!-- Avatar section -->
              <div class="mw-profile-avatar-section mb-4">
                <div class="mw-profile-avatar-wrap" id="profile-avatar-wrap">
                  ${renderAvatarPreview(avatarUrl, username, email)}
                </div>
                <div>
                  <p class="fw-bold mb-0" id="profile-display-name">
                    ${escapeHtml(username || email)}
                  </p>
                  <p class="text-muted small mb-0">${escapeHtml(email)}</p>
                  <p class="text-muted small mb-0">Member since ${memberSince}</p>
                </div>
              </div>

              <hr class="mw-profile-divider" />

              <!-- Edit form -->
              <form id="profile-form" novalidate>
                <div class="mb-3">
                  <label for="profile-username" class="form-label">Username</label>
                  <input
                    type="text"
                    class="form-control"
                    id="profile-username"
                    name="username"
                    value="${escapeHtml(username)}"
                    maxlength="60"
                    placeholder="Your display name"
                    autocomplete="username"
                  />
                  <div class="form-text">This is how your name appears across the app.</div>
                </div>

                <div class="mb-4">
                  <label for="profile-avatar-url" class="form-label">Avatar URL</label>
                  <input
                    type="url"
                    class="form-control"
                    id="profile-avatar-url"
                    name="avatarUrl"
                    value="${escapeHtml(avatarUrl)}"
                    placeholder="https://example.com/avatar.jpg"
                    autocomplete="off"
                  />
                  <div class="form-text">Paste a direct link to an image (JPG, PNG, etc.).</div>
                  <div class="invalid-feedback">Please enter a valid URL.</div>
                </div>

                <div class="d-flex gap-2 align-items-center">
                  <button type="submit" class="btn btn-primary" id="profile-save-btn">
                    Save changes
                  </button>
                  <span class="mw-profile-save-status text-muted small d-none" id="profile-save-status"></span>
                </div>
              </form>

            </div>
          </div>

        </div>
      </div>
    </section>
  `
}

function updateAvatarPreview(root, avatarUrl, username, email) {
  const wrap = root.querySelector('#profile-avatar-wrap')
  if (!wrap) return
  wrap.innerHTML = renderAvatarPreview(avatarUrl, username, email)
}

// eslint-disable-next-line no-unused-vars
export async function bindProfilePage(root, _router) {
  const form = root.querySelector('#profile-form')
  const saveBtn = root.querySelector('#profile-save-btn')
  const saveStatus = root.querySelector('#profile-save-status')
  const avatarUrlInput = root.querySelector('#profile-avatar-url')
  const usernameInput = root.querySelector('#profile-username')

  if (!form) return

  // Live avatar preview as the user types the URL
  let previewTimeout = null

  avatarUrlInput?.addEventListener('input', () => {
    clearTimeout(previewTimeout)
    previewTimeout = setTimeout(() => {
      const url = avatarUrlInput.value.trim()
      const user = getUser()
      const username = usernameInput?.value.trim() || ''
      updateAvatarPreview(root, url, username, user?.email || '')
    }, 400)
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    if (!form.checkValidity()) {
      form.classList.add('was-validated')
      return
    }

    const username = usernameInput?.value.trim() ?? ''
    const avatarUrl = avatarUrlInput?.value.trim() ?? ''

    if (saveBtn) {
      saveBtn.disabled = true
      saveBtn.textContent = 'Saving…'
    }

    if (saveStatus) {
      saveStatus.textContent = ''
      saveStatus.classList.add('d-none')
    }

    const { profile, error } = await updateProfile({ username, avatarUrl })

    if (saveBtn) {
      saveBtn.disabled = false
      saveBtn.textContent = 'Save changes'
    }

    if (error) {
      if (error.code === '23505') {
        // Unique constraint: username already taken
        toast.error('That username is already taken. Please choose another.')
      } else {
        toast.error('Could not save your profile. Please try again.')
      }
      return
    }

    await refreshProfile()

    // Update the display name shown in the avatar section
    const displayName = root.querySelector('#profile-display-name')
    const user = getUser()
    if (displayName) {
      displayName.textContent = profile.username || user?.email || ''
    }

    updateAvatarPreview(root, profile.avatar_url || '', profile.username || '', user?.email || '')

    if (saveStatus) {
      saveStatus.textContent = 'Saved!'
      saveStatus.classList.remove('d-none')
      setTimeout(() => {
        saveStatus.classList.add('d-none')
        saveStatus.textContent = ''
      }, 2500)
    }

    toast.success('Profile updated.')

    // Update the header nav username link in-place so the user sees the new name immediately
    const headerLink = document.querySelector('.mw-profile-nav-link')
    if (headerLink) {
      headerLink.textContent = profile.username || getUser()?.email || ''
    }
  })
}
