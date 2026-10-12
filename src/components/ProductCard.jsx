export function ProductCard({ product, onAddProduct }) {
  return (
    <article className="card-product">
      <img src={product.image} alt={product.alt || product.name} />
      <div className="card-body">
        <h4 className="card-title">{product.name}</h4>
        <p className="card-desc">{product.description}</p>
        <div className="card-footer">
          <span className="price">Bs. {product.price.toFixed(2)}</span>
          <button className="btn-add" type="button" onClick={() => onAddProduct(product)}>Agregar</button>
        </div>
      </div>
    </article>
  )
}