import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import { getCurrentRole, saveProfile, createOrder } from './data/supabaseApi.js'
import { Navbar } from './components/Navbar.jsx'
import { HomePage } from './components/HomePage.jsx'
import { MenuPage } from './components/MenuPage.jsx'
import { AuthPage } from './components/AuthPage.jsx'
import { OrderHistoryPage } from './components/OrderHistoryPage.jsx'
import { StaffPage } from './components/StaffPage.jsx'
import { Footer } from './components/Footer.jsx'
import { Toast } from './components/Toast.jsx'
import { CheckoutModal } from './components/CheckoutModal.jsx'

const storedCart = (userId) => {
  if (!userId) return []
  try {
    const value = JSON.parse(localStorage.getItem(`texasCart:${userId}`) || '[]')
    return Array.isArray(value)
      ? value.filter((item) => typeof item.id === 'string' && Number.isInteger(item.qty) && item.qty > 0)
      : []
  } catch {
    return []
  }
}

const basePath = import.meta.env.BASE_URL
const pagePath = (path) => `${basePath}${path}`

const currentPage = () => {
  const pathname = window.location.pathname.toLowerCase()
  const path = (basePath !== '/' && pathname.startsWith(basePath.toLowerCase())
    ? pathname.slice(basePath.length - 1)
    : pathname).replace(/\/$/, '') || '/'
  if (path === '/' || path === '/index.html') return 'home'
  if (path === '/menu' || path === '/menu.html') return 'menu'
  if (path === '/login' || path === '/login.html') return 'login'
  if (path === '/registro' || path === '/registro.html') return 'register'
  if (path === '/pedidos' || path === '/pedidos.html') return 'orders'
  if (path === '/admin' || path === '/admin.html') return 'admin'
  return 'not-found'
}

const applicationPaths = new Set(['', 'index.html', 'menu', 'menu.html', 'login', 'login.html', 'registro', 'registro.html', 'pedidos', 'pedidos.html', 'admin', 'admin.html']
  .map((path) => pagePath(path).toLowerCase().replace(/\/$/, '') || '/'))

function App() {
  const [page, setPage] = useState(currentPage)
  const [session, setSession] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [role, setRole] = useState('customer')
  const [roleLoading, setRoleLoading] = useState(false)
  const [cart, setCart] = useState([])
  const [cartOwnerId, setCartOwnerId] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [order, setOrder] = useState(null)
  const [redirectReason, setRedirectReason] = useState('')

  useEffect(() => {
    const onPopState = () => setPage(currentPage())
    const onDocumentClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target.closest('a[href]')
      if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.rel === 'external') return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash) return
      if (url.pathname.startsWith('/api/') || (!applicationPaths.has(url.pathname.toLowerCase()) && /\.[^/]+$/.test(url.pathname))) return
      event.preventDefault()
      window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
      setPage(currentPage())
      setCartOpen(false)
      if (!url.hash) window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onDocumentClick)
    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onDocumentClick)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true)
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setToast({ message: 'No se pudo recuperar la sesión. Inicia sesión de nuevo.' })
      setSession(data?.session || null)
      setSessionReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionReady) return
    const userId = session?.user?.id || null
    setCart(storedCart(userId))
    setCartOwnerId(userId)
  }, [sessionReady, session?.user?.id])

  useEffect(() => {
    const userId = session?.user?.id
    if (!sessionReady || !userId || cartOwnerId !== userId) return
    localStorage.setItem(`texasCart:${userId}`, JSON.stringify(cart))
  }, [cart, cartOwnerId, session?.user?.id, sessionReady])

  useEffect(() => {
    let active = true
    if (!session) {
      setRole('customer')
      setRoleLoading(false)
      return undefined
    }
    setRoleLoading(true)
    getCurrentRole()
      .then((nextRole) => { if (active) setRole(nextRole) })
      .catch(() => { if (active) setRole('customer') })
      .finally(() => { if (active) setRoleLoading(false) })
    return () => { active = false }
  }, [session?.user?.id])

  useEffect(() => {
    if (page !== 'login') return
    const reason = sessionStorage.getItem('loginRedirectReason')
    if (reason) {
      setRedirectReason(reason)
      sessionStorage.removeItem('loginRedirectReason')
    }
  }, [page])

  useEffect(() => {
    const closeCart = () => setCartOpen(false)
    window.addEventListener('click', closeCart)
    return () => window.removeEventListener('click', closeCart)
  }, [])

  const navigate = (path, nextPage) => {
    window.history.pushState({}, '', pagePath(path))
    setPage(nextPage)
    setCartOpen(false)
    window.scrollTo(0, 0)
  }

  const addProduct = (product) => {
    if (!session) {
      sessionStorage.setItem('loginRedirectReason', 'Inicia sesión para agregar productos a tu pedido.')
      navigate('login.html', 'login')
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
        : [...current, { ...product, qty: 1 }]
    })
    setToast({ message: `${product.name} agregado al pedido`, action: 'Ver carrito' })
  }

  const changeQuantity = (id, change) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, qty: item.qty + change } : item)
      .filter((item) => item.qty > 0))
  }

  const removeProduct = (id) => setCart((current) => current.filter((item) => item.id !== id))

  const checkout = () => {
    if (!session) {
      sessionStorage.setItem('loginRedirectReason', 'Inicia sesión para confirmar tu pedido.')
      navigate('login.html', 'login')
      return
    }
    if (cart.length === 0) return
    setCheckoutError('')
    setOrder(null)
    setCheckoutOpen(true)
    setCartOpen(false)
  }

  const submitOrder = async (details) => {
    setCheckoutSubmitting(true)
    setCheckoutError('')
    try {
      await saveProfile(session.user.id, { fullName: details.fullName, phone: details.phone })
      const created = await createOrder(cart, details)
      const count = cart.reduce((sum, item) => sum + item.qty, 0)
      setOrder({
        number: `#TX-${created.order_number}`,
        count,
        total: created.total.toFixed(2),
        deliveryType: created.delivery_type,
      })
      setCart([])
      localStorage.removeItem(`texasCart:${session.user.id}`)
      setToast({ message: 'Pedido guardado correctamente.' })
    } catch (error) {
      setCheckoutError(error.message || 'No se pudo guardar el pedido. Inténtalo de nuevo.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setToast({ message: 'No se pudo cerrar la sesión. Inténtalo de nuevo.' })
      return
    }
    setCartOpen(false)
    navigate('index.html', 'home')
    setToast({ message: 'Has cerrado sesión.' })
  }

  const afterAuthenticate = () => navigate('menu.html', 'menu')
  const loggedIn = Boolean(session)
  const isStaff = role === 'staff' || role === 'admin'

  return (
    <div className="app-shell">
      <Navbar
        page={page}
        loggedIn={loggedIn}
        isStaff={isStaff}
        cart={cart}
        cartOpen={cartOpen}
        onToggleCart={() => setCartOpen((open) => !open)}
        onChangeQuantity={changeQuantity}
        onRemoveProduct={removeProduct}
        onCheckout={checkout}
        onLogout={logout}
      />
      {page === 'home' && <HomePage />}
      {page === 'menu' && <MenuPage onAddProduct={addProduct} loggedIn={loggedIn} />}
      {(page === 'login' || page === 'register') && (
        <AuthPage page={page} redirectReason={redirectReason} onAuthenticated={afterAuthenticate} />
      )}
      {page === 'orders' && (
        <OrderHistoryPage loggedIn={loggedIn} onLogin={() => navigate('login.html', 'login')} />
      )}
      {page === 'admin' && (
        <StaffPage role={role} roleLoading={roleLoading} loggedIn={loggedIn} />
      )}
      {page === 'not-found' && (
        <main className="main-container"><section className="hero page-section"><h1>Página no encontrada</h1><p>La dirección que buscas no existe.</p><a href={pagePath('index.html')} className="btn-primary">Volver al inicio</a></section></main>
      )}
      <Footer page={page} />
      {toast && <Toast message={toast.message} action={toast.action} onAction={() => setCartOpen(true)} onClose={() => setToast(null)} />}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          user={session?.user}
          order={order}
          submitting={checkoutSubmitting}
          error={checkoutError}
          onSubmit={submitOrder}
          onClose={() => { setCheckoutOpen(false); setOrder(null); setCheckoutError('') }}
        />
      )}
      {!sessionReady && <div className="session-loading" role="status">Cargando sesión…</div>}
      {sessionReady && !isSupabaseConfigured && (
        <div className="config-notice" role="status">Conecta Supabase con las variables de entorno para cargar el menú, iniciar sesión y guardar pedidos.</div>
      )}
    </div>
  )
}

export default App
