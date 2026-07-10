import { getSupabase } from './supabase.js'

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
