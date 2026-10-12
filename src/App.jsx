import { useEffect, useState } from 'react'
import { products } from './data/products.js'
import { Navbar } from './components/Navbar.jsx'
import { HomePage } from './components/HomePage.jsx'
import { MenuPage } from './components/MenuPage.jsx'
import { AuthPage } from './components/AuthPage.jsx'
import { Footer } from './components/Footer.jsx'
import { Toast } from './components/Toast.jsx'
import { CheckoutModal } from './components/CheckoutModal.jsx'

const storedCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem('texasCart') || '[]')
    return Array.isArray(value) ? value : []
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
  return 'not-found'
}

const applicationPaths = new Set(['', 'index.html', 'menu', 'menu.html', 'login', 'login.html', 'registro', 'registro.html']
  .map((path) => pagePath(path).toLowerCase().replace(/\/$/, '') || '/'))

function App() {
  const [page, setPage] = useState(currentPage)
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('texasLoggedIn') === 'true')
  const [cart, setCart] = useState(storedCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
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
    localStorage.setItem('texasCart', JSON.stringify(cart))
  }, [cart])

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

  const addProduct = (product) => {
    if (!loggedIn) {
      sessionStorage.setItem('loginRedirectReason', 'Debes iniciar sesión para agregar productos a tu pedido.')
      window.history.pushState({}, '', pagePath('login.html'))
      setPage('login')
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.name === product.name)
      return existing
        ? current.map((item) => item.name === product.name ? { ...item, qty: item.qty + 1 } : item)
        : [...current, { ...product, id: Date.now() + Math.random(), qty: 1 }]
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
    const count = cart.reduce((sum, item) => sum + item.qty, 0)
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
    const number = Math.floor(Math.random() * 90000) + 10000
    setOrder({ number: `#TX-${number}`, count, total: total.toFixed(2) })
    setCart([])
    setCartOpen(false)
  }

  const logout = () => {
    localStorage.removeItem('texasLoggedIn')
    setLoggedIn(false)
    setCartOpen(false)
    window.alert('Has cerrado sesión.')
    window.history.pushState({}, '', pagePath('index.html'))
    setPage('home')
  }

  const authenticate = (message) => {
    localStorage.setItem('texasLoggedIn', 'true')
    setLoggedIn(true)
    window.alert(message)
    window.history.pushState({}, '', pagePath('menu.html'))
    setPage('menu')
  }

  return (
    <div className="app-shell">
      <Navbar
        page={page}
        loggedIn={loggedIn}
        cart={cart}
        cartOpen={cartOpen}
        onToggleCart={() => setCartOpen((open) => !open)}
        onChangeQuantity={changeQuantity}
        onRemoveProduct={removeProduct}
        onCheckout={checkout}
        onLogout={logout}
      />
      {page === 'home' && <HomePage />}
      {page === 'menu' && <MenuPage products={products} onAddProduct={addProduct} />}
      {(page === 'login' || page === 'register') && (
        <AuthPage page={page} redirectReason={redirectReason} onAuthenticate={authenticate} />
      )}
      {page === 'not-found' && (
        <main className="main-container"><section className="hero page-section"><h1>Página no encontrada</h1><p>La dirección que buscas no existe.</p><a href={pagePath('index.html')} className="btn-primary">Volver al inicio</a></section></main>
      )}
      <Footer page={page} />
      {toast && <Toast message={toast.message} action={toast.action} onAction={() => setCartOpen(true)} onClose={() => setToast(null)} />}
      {order && <CheckoutModal order={order} onClose={() => setOrder(null)} />}
    </div>
  )
}

export default App
