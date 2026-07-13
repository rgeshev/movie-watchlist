import { getSupabase } from './supabase.js'
import { getUser } from './auth.js'
import { getGenres } from './movies.js'

const EXPORT_VERSION = 1

export async function exportWatchlist() {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const [moviesResult, seriesResult] = await Promise.all([
    supabase
      .from('movies')
      .select('title, description, year, status, rating, genres(name)')
      .order('position', { ascending: true }),
    supabase
      .from('series')
      .select('title, description, year, total_seasons, total_episodes, status, rating, genres(name)')
      .order('position', { ascending: true }),
  ])

  if (moviesResult.error) return { error: moviesResult.error }
  if (seriesResult.error) return { error: seriesResult.error }

  const payload = {
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    movies: (moviesResult.data ?? []).map((m) => ({
      title: m.title,
      description: m.description ?? null,
      year: m.year ?? null,
      genre: m.genres?.name ?? null,
      status: m.status,
      rating: m.rating ?? null,
    })),
    series: (seriesResult.data ?? []).map((s) => ({
      title: s.title,
      description: s.description ?? null,
      year: s.year ?? null,
      totalSeasons: s.total_seasons ?? null,
      totalEpisodes: s.total_episodes ?? null,
      genre: s.genres?.name ?? null,
      status: s.status,
      rating: s.rating ?? null,
    })),
  }

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = `watchlist-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(blobUrl)

  return {
    error: null,
    counts: { movies: payload.movies.length, series: payload.series.length },
  }
}

export async function importWatchlist(jsonText) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const user = getUser()

  if (!user) {
    return { error: new Error('Not authenticated.') }
  }

  let parsed

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { error: new Error('The file is not valid JSON.') }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (!Array.isArray(parsed.movies) && !Array.isArray(parsed.series))
  ) {
    return { error: new Error('This does not look like a Watchlist export file.') }
  }

  // Map genre names → IDs
  const { genres, error: genresError } = await getGenres()

  if (genresError) {
    return { error: genresError }
  }

  const genreMap = new Map((genres ?? []).map((g) => [g.name.toLowerCase(), g.id]))

  const movies = Array.isArray(parsed.movies) ? parsed.movies : []
  const series = Array.isArray(parsed.series) ? parsed.series : []

  let moviesImported = 0
  let seriesImported = 0
  let skipped = 0

  // Insert movies sequentially to keep positions stable
  for (let i = 0; i < movies.length; i += 1) {
    const m = movies[i]
    const title = String(m.title ?? '').trim().slice(0, 200)

    if (!title) {
      skipped += 1
      continue
    }

    const { error } = await supabase.from('movies').insert({
      user_id: user.id,
      title,
      description: m.description ? String(m.description).slice(0, 2000) : null,
      year: m.year ? Number(m.year) : null,
      genre_id: m.genre ? (genreMap.get(String(m.genre).toLowerCase()) ?? null) : null,
      status: m.status === 'watched' ? 'watched' : 'want_to_watch',
      rating: m.rating ? Math.min(5, Math.max(1, Number(m.rating))) : null,
      position: i,
    })

    if (error) {
      skipped += 1
    } else {
      moviesImported += 1
    }
  }

  // Insert series
  for (let i = 0; i < series.length; i += 1) {
    const s = series[i]
    const title = String(s.title ?? '').trim().slice(0, 200)

    if (!title) {
      skipped += 1
      continue
    }

    const { error } = await supabase.from('series').insert({
      user_id: user.id,
      title,
      description: s.description ? String(s.description).slice(0, 2000) : null,
      year: s.year ? Number(s.year) : null,
      total_seasons: s.totalSeasons ? Number(s.totalSeasons) : null,
      total_episodes: s.totalEpisodes ? Number(s.totalEpisodes) : null,
      genre_id: s.genre ? (genreMap.get(String(s.genre).toLowerCase()) ?? null) : null,
      status: s.status === 'watched' ? 'watched' : 'want_to_watch',
      rating: s.rating ? Math.min(5, Math.max(1, Number(s.rating))) : null,
      position: i,
    })

    if (error) {
      skipped += 1
    } else {
      seriesImported += 1
    }
  }

  return {
    error: null,
    counts: { movies: moviesImported, series: seriesImported, skipped },
  }
}
