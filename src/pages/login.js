import { signIn, signUp } from '../lib/auth.js'
import { toast } from '../components/toast.js'

export function renderLoginPage() {
  return `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-5">
          <div class="text-center mb-4">
            <h1 class="h2 mb-2">Welcome back</h1>
            <p class="text-muted mb-0">Sign in to your account or create a new one.</p>
          </div>

          <div class="card mw-auth-card">
            <div class="card-body p-4">
              <ul class="nav nav-pills nav-fill mb-4" id="authTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link active"
                    id="login-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#login-panel"
                    type="button"
                    role="tab"
                    aria-controls="login-panel"
                    aria-selected="true"
                  >
                    Sign in
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    id="register-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#register-panel"
                    type="button"
                    role="tab"
                    aria-controls="register-panel"
                    aria-selected="false"
                  >
                    Register
                  </button>
                </li>
              </ul>

              <div class="tab-content">
                <div
                  class="tab-pane fade show active"
                  id="login-panel"
                  role="tabpanel"
                  aria-labelledby="login-tab"
                  tabindex="0"
                >
                  <form id="login-form" novalidate>
                    <div class="mb-3">
                      <label for="login-email" class="form-label">Email</label>
                      <input
                        type="email"
                        class="form-control"
                        id="login-email"
                        name="email"
                        autocomplete="email"
                        required
                      />
                    </div>
                    <div class="mb-4">
                      <label for="login-password" class="form-label">Password</label>
                      <input
                        type="password"
                        class="form-control"
                        id="login-password"
                        name="password"
                        autocomplete="current-password"
                        required
                        minlength="6"
                      />
                    </div>
                    <button type="submit" class="btn btn-primary w-100" id="login-submit">
                      Sign in
                    </button>
                  </form>
                </div>

                <div
                  class="tab-pane fade"
                  id="register-panel"
                  role="tabpanel"
                  aria-labelledby="register-tab"
                  tabindex="0"
                >
                  <form id="register-form" novalidate>
                    <div class="mb-3">
                      <label for="register-username" class="form-label">Username</label>
                      <input
                        type="text"
                        class="form-control"
                        id="register-username"
                        name="username"
                        autocomplete="username"
                        required
                        minlength="3"
                        maxlength="30"
                        pattern="[a-zA-Z0-9_]+"
                      />
                      <div class="form-text">Letters, numbers, and underscores only.</div>
                    </div>
                    <div class="mb-3">
                      <label for="register-email" class="form-label">Email</label>
                      <input
                        type="email"
                        class="form-control"
                        id="register-email"
                        name="email"
                        autocomplete="email"
                        required
                      />
                    </div>
                    <div class="mb-3">
                      <label for="register-password" class="form-label">Password</label>
                      <input
                        type="password"
                        class="form-control"
                        id="register-password"
                        name="password"
                        autocomplete="new-password"
                        required
                        minlength="6"
                      />
                    </div>
                    <div class="mb-4">
                      <label for="register-confirm-password" class="form-label">Confirm password</label>
                      <input
                        type="password"
                        class="form-control"
                        id="register-confirm-password"
                        name="confirmPassword"
                        autocomplete="new-password"
                        required
                        minlength="6"
                      />
                    </div>
                    <button type="submit" class="btn btn-primary w-100" id="register-submit">
                      Create account
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

function setSubmitting(button, isSubmitting, defaultLabel) {
  button.disabled = isSubmitting
  button.textContent = isSubmitting ? 'Please wait…' : defaultLabel
}

export function bindLoginPage(root, router) {
  const loginForm = root.querySelector('#login-form')
  const registerForm = root.querySelector('#register-form')

  if (!loginForm || !registerForm) {
    return
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    if (!loginForm.checkValidity()) {
      loginForm.classList.add('was-validated')
      return
    }

    const submitButton = root.querySelector('#login-submit')
    const formData = new FormData(loginForm)
    const email = formData.get('email').trim()
    const password = formData.get('password')

    setSubmitting(submitButton, true, 'Sign in')

    const { error } = await signIn(email, password)

    setSubmitting(submitButton, false, 'Sign in')

    if (error) {
      toast.error(error.message)
      return
    }

    router.navigate('/dashboard')
  })

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const formData = new FormData(registerForm)
    const username = formData.get('username').trim()
    const email = formData.get('email').trim()
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (!registerForm.checkValidity()) {
      registerForm.classList.add('was-validated')
      return
    }

    const submitButton = root.querySelector('#register-submit')

    setSubmitting(submitButton, true, 'Create account')

    const { data, error } = await signUp(email, password, username)

    setSubmitting(submitButton, false, 'Create account')

    if (error) {
      toast.error(error.message)
      return
    }

    if (data.session) {
      router.navigate('/dashboard')
      return
    }

    toast.info('Account created. Check your email to confirm your address, then sign in.')

    const loginTab = root.querySelector('#login-tab')
    if (loginTab) {
      loginTab.click()
    }
  })
}
