export function CartDropdown({ cart, open, onChangeQuantity, onRemoveProduct, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className={`cart-dropdown${open ? ' active' : ''}`} aria-hidden={!open}>
      <h4>Tu Pedido</h4>
      <ul className="cart-items-list">
        {cart.length === 0 ? (
          <li style={{ padding: '10px 0', color: '#888' }}>El carrito está vacío.</li>
        ) : cart.map((item) => (
          <li className="cart-item" key={item.id}>
            <div className="cart-item-details">
              <strong>{item.name}</strong>
              <span>Bs. {(item.price * item.qty).toFixed(2)}</span>
            </div>
            <div className="cart-item-controls">
              <button className="btn-qty" type="button" aria-label={`Disminuir cantidad de ${item.name}`} onClick={() => onChangeQuantity(item.id, -1)}>-</button>
              <span>{item.qty}</span>
              <button className="btn-qty" type="button" aria-label={`Aumentar cantidad de ${item.name}`} onClick={() => onChangeQuantity(item.id, 1)}>+</button>
              <button className="btn-remove" type="button" aria-label={`Eliminar ${item.name} del carrito`} onClick={() => onRemoveProduct(item.id)}>&times;</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="cart-total">Total: Bs. <span>{total.toFixed(2)}</span></div>
      {cart.length > 0 && <button className="btn-submit" style={{ marginTop: 12 }} type="button" onClick={onCheckout}>Realizar pedido</button>}
    </div>
  )
}