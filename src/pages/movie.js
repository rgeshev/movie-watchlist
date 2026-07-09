export function renderMoviePage({ id = '' } = {}) {
  return `
    <section>
      <h1 class="h2 mb-3">Movie Details</h1>
      <p class="text-muted">Movie ID: <strong>${id}</strong></p>
    </section>
  `
}
