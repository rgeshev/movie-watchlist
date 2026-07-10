import { getSupabase } from './supabase.js'
import { getUser } from './auth.js'

const MOVIE_SELECT = `
  id,
  title,
  description,
  year,
  status,
  position,
  genre_id,
  genres ( name )
`

async function getNextPosition(status) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('movies')
    .select('position')
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { position: 0, error }
  }

  return { position: (data?.position ?? -1) + 1, error: null }
}

export async function getMovies() {
  const supabase = getSupabase()

  if (!supabase) {
    return { movies: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase
    .from('movies')
    .select(MOVIE_SELECT)
    .order('position', { ascending: true })

  if (error) {
    return { movies: null, error }
  }

  return { movies: data ?? [], error: null }
}

export async function getGenres() {
  const supabase = getSupabase()

  if (!supabase) {
    return { genres: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase.from('genres').select('id, name').order('name')

  if (error) {
    return { genres: null, error }
  }

  return { genres: data ?? [], error: null }
}

export async function getMovie(id) {
  const supabase = getSupabase()

  if (!supabase) {
    return { movie: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase
    .from('movies')
    .select(MOVIE_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { movie: null, error }
  }

  return { movie: data, error: null }
}

export async function createMovie({ title, description, genreId, year, status }) {
  const supabase = getSupabase()
  const user = getUser()

  if (!supabase) {
    return { movie: null, error: new Error('Supabase is not configured.') }
  }

  if (!user) {
    return { movie: null, error: new Error('You must be signed in to add a movie.') }
  }

  const { position, error: positionError } = await getNextPosition(status)

  if (positionError) {
    return { movie: null, error: positionError }
  }

  const { data, error } = await supabase
    .from('movies')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      genre_id: genreId || null,
      year: year ?? null,
      status,
      position,
    })
    .select(MOVIE_SELECT)
    .single()

  if (error) {
    return { movie: null, error }
  }

  return { movie: data, error: null }
}

export async function updateMovie(id, { title, description, genreId, year, status }, currentStatus) {
  const supabase = getSupabase()

  if (!supabase) {
    return { movie: null, error: new Error('Supabase is not configured.') }
  }

  const updates = {
    title: title.trim(),
    description: description?.trim() || null,
    genre_id: genreId || null,
    year: year ?? null,
    status,
  }

  if (status !== currentStatus) {
    const { position, error: positionError } = await getNextPosition(status)

    if (positionError) {
      return { movie: null, error: positionError }
    }

    updates.position = position
  }

  const { data, error } = await supabase
    .from('movies')
    .update(updates)
    .eq('id', id)
    .select(MOVIE_SELECT)
    .single()

  if (error) {
    return { movie: null, error }
  }

  return { movie: data, error: null }
}

export async function deleteMovie(id) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const { error } = await supabase.from('movies').delete().eq('id', id)

  return { error }
}

export async function reorderMovies(updates) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  if (!updates?.length) {
    return { error: null }
  }

  const results = await Promise.all(
    updates.map(({ id, status, position }) =>
      supabase.from('movies').update({ status, position }).eq('id', id),
    ),
  )

  const failed = results.find((result) => result.error)

  if (failed) {
    return { error: failed.error }
  }

  return { error: null }
}

export async function getMovieStats() {
  const supabase = getSupabase()

  if (!supabase) {
    return { stats: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase.from('movies').select('status')

  if (error) {
    return { stats: null, error }
  }

  const rows = data ?? []

  return {
    stats: {
      total: rows.length,
      want_to_watch: rows.filter((row) => row.status === 'want_to_watch').length,
      watched: rows.filter((row) => row.status === 'watched').length,
    },
    error: null,
  }
}
