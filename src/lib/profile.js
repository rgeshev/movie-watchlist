import { getSupabase } from './supabase.js'
import { getUser } from './auth.js'

export async function updateProfile({ username, avatarUrl }) {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const user = getUser()

  if (!user) {
    return { error: new Error('Not authenticated.') }
  }

  const updates = {}

  if (username !== undefined) {
    updates.username = username || null
  }

  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl || null
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, username, avatar_url, role, created_at')
    .single()

  if (error) {
    return { error }
  }

  // Keep auth user_metadata in sync so the header display name stays current
  if (username !== undefined) {
    await supabase.auth.updateUser({ data: { username: data.username } })
  }

  return { profile: data, error: null }
}
