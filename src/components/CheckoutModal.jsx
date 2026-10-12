import { useEffect } from 'react'

export function CheckoutModal({ order, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="modal active" role="presentation" onClick={onClose}>
      <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="Cerrar modal" onClick={onClose}>&times;</button>
        <h2 id="order-title">¡Pedido Confirmado! 🎉</h2>
        <p>Tu orden <strong style={{ color: 'var(--primary-red)' }}>{order.number}</strong> ha sido registrada.</p>
        <div className="order-summary-box">
          <p><strong>Productos:</strong> {order.count} items</p>
          <p><strong>Total a pagar:</strong> Bs. {order.total}</p>
        </div>
        <p className="modal-next-steps">
          <strong>Siguiente paso:</strong><br />
          Estamos preparando tu comida. El tiempo estimado de entrega es de <strong>30 a 45 minutos</strong>.<br /><br />
          Nos contactaremos a tu número para coordinar la entrega.
        </p>
        <button className="btn-submit" type="button" onClick={onClose}>Entendido</button>
      </section>
    </div>
  )
}