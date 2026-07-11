import { getSupabase } from './supabase.js'
import { deleteMovie, updateMovie } from './movies.js'
import { deleteSeries, updateSeries } from './series.js'

const ADMIN_MOVIE_SELECT = `
  id,
  user_id,
  title,
  description,
  year,
  status,
  position,
  genre_id,
  created_at,
  genres ( name ),
  profiles ( username )
`

const ADMIN_SERIES_SELECT = `
  id,
  user_id,
  title,
  description,
  year,
  total_seasons,
  total_episodes,
  status,
  position,
  genre_id,
  created_at,
  genres ( name ),
  profiles ( username )
`

export async function getAdminUsers() {
  const supabase = getSupabase()

  if (!supabase) {
    return { users: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase.rpc('get_admin_users')

  if (error) {
    return { users: null, error }
  }

  return { users: data ?? [], error: null }
}

export async function updateUserRole(userId, role) {
  const supabase = getSupabase()

  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id, username, role')
    .single()

  if (error) {
    return { profile: null, error }
  }

  return { profile: data, error: null }
}

export async function deleteUserProfile(userId) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const { error } = await supabase.from('profiles').delete().eq('id', userId)

  return { error }
}

export async function deleteAuthUser(userId) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId },
  })

  if (error) {
    return { error }
  }

  if (data?.error) {
    return { error: new Error(data.error) }
  }

  return { error: null }
}

export async function getAllMovies() {
  const supabase = getSupabase()

  if (!supabase) {
    return { movies: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase
    .from('movies')
    .select(ADMIN_MOVIE_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    return { movies: null, error }
  }

  return { movies: data ?? [], error: null }
}

export async function getAllSeries() {
  const supabase = getSupabase()

  if (!supabase) {
    return { series: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase
    .from('series')
    .select(ADMIN_SERIES_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    return { series: null, error }
  }

  return { series: data ?? [], error: null }
}

export async function adminUpdateMovie(id, values, currentStatus) {
  return updateMovie(id, values, currentStatus)
}

export async function adminDeleteMovie(id) {
  return deleteMovie(id)
}

export async function adminUpdateSeries(id, values, currentStatus) {
  return updateSeries(id, values, currentStatus)
}

export async function adminDeleteSeries(id) {
  return deleteSeries(id)
}
