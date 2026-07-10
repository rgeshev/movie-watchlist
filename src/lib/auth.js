import { getSupabase } from './supabase.js'

let currentSession = null
const listeners = new Set()

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

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session
    listeners.forEach((listener) => listener(session))
  })
}

export function getSession() {
  return currentSession
}

export function getUser() {
  return currentSession?.user ?? null
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

  return supabase.auth.signInWithPassword({ email, password })
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

  return supabase.auth.signOut()
}
