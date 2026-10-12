import { useState } from 'react'
import { CartDropdown } from './CartDropdown.jsx'

const links = [
  { page: 'home', label: 'Inicio', href: '/index.html' },
  { page: 'menu', label: 'Menú', href: '/menu.html' },
  { page: 'login', label: 'Iniciar Sesión', href: '/login.html', auth: 'guest' },
  { page: 'register', label: 'Registrarse', href: '/registro.html', auth: 'guest' },
]

function NavbarLinks({ page, loggedIn, open, onLogout }) {
  return (
    <ul className={`nav-links${open ? ' active' : ''}`}>
      {links.map((link) => {
        if (link.auth === 'guest' && loggedIn) return null
        return (
          <li key={link.page}>
            <a className={page === link.page ? 'active' : undefined} href={`${import.meta.env.BASE_URL}${link.href.slice(1)}`}>
              {link.label}
            </a>
          </li>
        )
      })}
      {loggedIn && <li><button className="btn-logout" onClick={onLogout}>Cerrar Sesión</button></li>}
    </ul>
  )
}

export function Navbar({ page, loggedIn, cart, cartOpen, onToggleCart, onChangeQuantity, onRemoveProduct, onCheckout, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="navbar">
      <a href={`${import.meta.env.BASE_URL}index.html`} className="logo" aria-label="Página de inicio de Texas Chicken">
        <span className="logo-badge">T</span>
        <span className="logo-text">Texas Chicken</span>
      </a>
      <button
        className="menu-toggle"
        type="button"
        aria-label={mobileOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        ☰
      </button>
      <NavbarLinks page={page} loggedIn={loggedIn} open={mobileOpen} onLogout={onLogout} />
      <div className="nav-right-actions">
        <div className="cart-container" onClick={(event) => event.stopPropagation()}>
          <button className="btn-cart" type="button" aria-label={`Carrito de compras, ${cart.reduce((sum, item) => sum + item.qty, 0)} productos`} aria-expanded={cartOpen} onClick={onToggleCart}>
            🛒 <span className="cart-text-mobile-hide">Carrito</span> (<span>{cart.reduce((sum, item) => sum + item.qty, 0)}</span>)
          </button>
          <CartDropdown
            cart={cart}
            open={cartOpen}
            onChangeQuantity={onChangeQuantity}
            onRemoveProduct={onRemoveProduct}
            onCheckout={onCheckout}
          />
        </div>
      </div>
    </nav>
  )
}
