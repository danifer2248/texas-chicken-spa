const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
const SESSION_KEY = 'texasChickenSupabaseSession'

function configuration() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Falta configurar Supabase. Copia .env.example a .env.local y completa la URL y la clave pública del proyecto.')
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY }
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function saveSession(session) {
  if (!session?.access_token) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  const normalized = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Date.now() + Number(session.expires_in || 3600) * 1000,
    user: session.user,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalized))
  return normalized
}

async function request(path, { method = 'GET', body, accessToken } = {}) {
  const { url, key } = configuration()
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || data?.hint || 'La solicitud a Supabase no pudo completarse.')
  }
  return data
}

export async function signUp({ name, email, password }) {
  const data = await request('/auth/v1/signup', {
    method: 'POST',
    body: { email, password, data: { full_name: name } },
  })
  const session = data?.access_token ? saveSession(data) : null
  return { session, user: data?.user || data, confirmationRequired: !session }
}

export async function signIn({ email, password }) {
  const data = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  })
  return saveSession(data)
}

export async function signOut() {
  const session = readStoredSession()
  try {
    if (session?.access_token) {
      await request('/auth/v1/logout', { method: 'POST', accessToken: session.access_token })
    }
  } finally {
    localStorage.removeItem(SESSION_KEY)
  }
}

export async function getSession() {
  const session = readStoredSession()
  if (!session?.access_token) return null
  if (session.expires_at && session.expires_at > Date.now() + 60000) return session
  if (!session.refresh_token) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  try {
    const data = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refresh_token },
    })
    return saveSession(data)
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export async function createOrder(items) {
  const session = await getSession()
  if (!session?.access_token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
  return request('/rest/v1/rpc/create_order', {
    method: 'POST',
    accessToken: session.access_token,
    body: {
      p_payload: {
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      },
    },
  })
}
