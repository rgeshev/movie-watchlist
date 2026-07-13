import { getSupabase } from './supabase.js'
import { getUser } from './auth.js'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function uploadAvatar(file) {
  const supabase = getSupabase()

  if (!supabase) {
    return { url: null, error: new Error('Supabase is not configured.') }
  }

  const user = getUser()

  if (!user) {
    return { url: null, error: new Error('Not authenticated.') }
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { url: null, error: new Error('File is too large. Maximum size is 5 MB.') }
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: new Error('Unsupported file type. Please use JPG, PNG, GIF, or WebP.') }
  }

  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    return { url: null, error: uploadError }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)

  // Append a cache-buster so browsers reload the new image immediately
  const url = `${data.publicUrl}?t=${Date.now()}`

  return { url, error: null }
}

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
