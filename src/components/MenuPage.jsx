import { useEffect, useState } from 'react'
import { getProducts } from '../data/supabaseApi.js'
import { categories } from '../data/products.js'
import { ProductCard } from './ProductCard.jsx'

function CategoryNav() {
  return (
    <div className="menu-categories-wrapper">
      <nav className="menu-categories-nav" aria-label="Categorías del menú">
        {categories.map((category) => (
          <a className="cat-btn" href={`#${category.id}`} key={category.id}>
            {category.icon} {category.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

export function MenuPage({ onAddProduct }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getProducts()
      .then((items) => { if (active) setProducts(items) })
      .catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <main className="main-container">
      <h2 className="section-title">Nuestro Menú</h2>
      {loading && <p className="data-state" role="status">Cargando menú…</p>}
      {error && <p className="data-state data-error" role="alert">No se pudo cargar el menú: {error}</p>}
      {!loading && !error && products.length === 0 && <p className="data-state">No hay productos disponibles en este momento.</p>}
      {!loading && !error && products.length > 0 && (
        <>
          <CategoryNav />
          {categories.map((category) => {
            const categoryProducts = products.filter((product) => product.category === category.id)
            if (!categoryProducts.length) return null
            return (
              <section className="menu-category-group page-section" id={category.id} key={category.id}>
                <h3 className="category-title">{category.label}</h3>
                <div className="grid-menu">
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAddProduct={onAddProduct} />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </main>
  )
}
