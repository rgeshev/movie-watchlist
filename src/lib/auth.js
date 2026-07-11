import { getSupabase } from './supabase.js'

let currentSession = null
let currentProfile = null
const listeners = new Set()

async function loadProfile(user) {
  if (!user) {
    currentProfile = null
    return
  }

  const supabase = getSupabase()

  if (!supabase) {
    currentProfile = null
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, role, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load profile:', error)
    currentProfile = null
    return
  }

  currentProfile = data
}

export async function initAuth() {
  const supabase = getSupabase()

  if (!supabase) {
    console.warn(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and add your Supabase credentials.',
    )
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  currentSession = session
  await loadProfile(session?.user ?? null)

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentSession = session
    await loadProfile(session?.user ?? null)
    listeners.forEach((listener) => listener(session))
  })
}

export function getSession() {
  return currentSession
}

export function getUser() {
  return currentSession?.user ?? null
}

export function getProfile() {
  return currentProfile
}

export function isAdmin() {
  return currentProfile?.role === 'admin'
}

export async function refreshProfile() {
  await loadProfile(getUser())
}

export function onAuthChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function signIn(email, password) {
  const supabase = getSupabase()

  if (!supabase) {
    return { data: { user: null, session: null }, error: new Error('Supabase is not configured.') }
  }

  const result = await supabase.auth.signInWithPassword({ email, password })

  if (!result.error) {
    currentSession = result.data.session
    await loadProfile(result.data.user)
  }

  return result
}

export async function signUp(email, password, username) {
  const supabase = getSupabase()

  if (!supabase) {
    return { data: { user: null, session: null }, error: new Error('Supabase is not configured.') }
  }

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })
}

export async function signOut() {
  const supabase = getSupabase()

  if (!supabase) {
    return { error: new Error('Supabase is not configured.') }
  }

  const result = await supabase.auth.signOut()
  currentProfile = null
  return result
}
