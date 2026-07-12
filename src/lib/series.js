import { getSupabase } from './supabase.js'
import { getUser } from './auth.js'

const SERIES_SELECT = `
  id,
  title,
  description,
  year,
  total_seasons,
  total_episodes,
  status,
  position,
  rating,
  genre_id,
  genres ( name )
`

async function getNextPosition(status) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('series')
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

export async function getSeries() {
  const supabase = getSupabase()

  if (!supabase) {
    return { series: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .order('position', { ascending: true })

  if (error) {
    return { series: null, error }
  }

  return { series: data ?? [], error: null }
}

export async function createSeries({
  title,
  description,
  genreId,
  year,
  totalSeasons,
  totalEpisodes,
  status,
  rating,
}) {
  const supabase = getSupabase()
  const user = getUser()

  if (!supabase) {
    return { series: null, error: new Error('Supabase is not configured.') }
  }

  if (!user) {
    return { series: null, error: new Error('You must be signed in to add a series.') }
  }

  const { position, error: positionError } = await getNextPosition(status)

  if (positionError) {
    return { series: null, error: positionError }
  }

  const { data, error } = await supabase
    .from('series')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      genre_id: genreId || null,
      year: year ?? null,
      total_seasons: totalSeasons ?? null,
      total_episodes: totalEpisodes ?? null,
      rating: rating ?? null,
      status,
      position,
    })
    .select(SERIES_SELECT)
    .single()

  if (error) {
    return { series: null, error }
  }

  return { series: data, error: null }
}

export async function updateSeries(
  id,
  { title, description, genreId, year, totalSeasons, totalEpisodes, status, rating },
  currentStatus,
) {
  const supabase = getSupabase()

  if (!supabase) {
    return { series: null, error: new Error('Supabase is not configured.') }
  }

  const updates = {
    title: title.trim(),
    description: description?.trim() || null,
    genre_id: genreId || null,
    year: year ?? null,
    total_seasons: totalSeasons ?? null,
    total_episodes: totalEpisodes ?? null,
    rating: rating ?? null,
    status,
  }

  if (status !== currentStatus) {
    const { position, error: positionError } = await getNextPosition(status)

    if (positionError) {
      return { series: null, error: positionError }
    }

    updates.position = position
  }

  const { data, error } = await supabase
    .from('series')
    .update(updates)
    .eq('id', id)
    .select(SERIES_SELECT)
    .single()

  if (error) {
    return { series: null, error }
  }

  return { series: data, error: null }
}

export async function deleteSeries(id) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const { error } = await supabase.from('series').delete().eq('id', id)

  return { error }
}

export async function reorderSeries(updates) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  if (!updates?.length) {
    return { error: null }
  }

  const results = await Promise.all(
    updates.map(({ id, status, position }) =>
      supabase.from('series').update({ status, position }).eq('id', id),
    ),
  )

  const failed = results.find((result) => result.error)

  if (failed) {
    return { error: failed.error }
  }

  return { error: null }
}

export async function getSeriesStats() {
  const supabase = getSupabase()

  if (!supabase) {
    return { stats: null, error: new Error('Supabase is not configured.') }
  }

  const { data, error } = await supabase.from('series').select('status')

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
