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

export function MenuPage({ products, onAddProduct }) {
  return (
    <main className="main-container">
      <h2 className="section-title">Nuestro Menú</h2>
      <CategoryNav />
      {categories.map((category) => (
        <section className="menu-category-group page-section" id={category.id} key={category.id}>
          <h3 className="category-title">{category.label}</h3>
          <div className="grid-menu">
            {products.filter((product) => product.category === category.id).map((product) => (
              <ProductCard key={product.name} product={product} onAddProduct={onAddProduct} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}