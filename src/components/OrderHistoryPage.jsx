import { useCallback, useEffect, useState } from 'react'
import { cancelOrder, getOrders } from '../data/supabaseApi.js'

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const formatDate = (value) => new Date(value).toLocaleString('es-BO', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function OrderHistoryPage({ loggedIn, onLogin }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await getOrders())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false)
      return
    }
    load()
  }, [loggedIn, load])

  const cancel = async (orderId) => {
    setActionId(orderId)
    setError('')
    try {
      const updated = await cancelOrder(orderId)
      setOrders((current) => current.map((order) => order.id === updated.id ? { ...order, ...updated } : order))
    } catch (cancelError) {
      setError(cancelError.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <main className="main-container">
      <section className="page-section data-page">
        <h1 className="section-title">Mis pedidos</h1>
        {!loggedIn ? (
          <div className="data-state">Inicia sesión para consultar tu historial. <button className="text-button" type="button" onClick={onLogin}>Iniciar sesión</button></div>
        ) : (
          <>
            {error && <p className="data-state data-error" role="alert">{error}</p>}
            {loading && <p className="data-state" role="status">Cargando pedidos…</p>}
            {!loading && !error && orders.length === 0 && <p className="data-state">Todavía no tienes pedidos.</p>}
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-heading">
                    <div>
                      <h2>Pedido #TX-{order.order_number}</h2>
                      <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                    </div>
                    <span className={`order-status status-${order.status}`}>{statusLabels[order.status] || order.status}</span>
                  </div>
                  <ul className="order-lines">
                    {order.order_items.map((item) => (
                      <li key={item.id}>
                        <span>{item.quantity} × {item.product_name}</span>
                        <span>Bs. {item.subtotal.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <p><strong>Total:</strong> Bs. {order.total.toFixed(2)}</p>
                  <p><strong>Entrega:</strong> {order.delivery_type === 'delivery' ? `Delivery — ${order.address}` : 'Recoger en el local'}</p>
                  <p><strong>Contacto:</strong> {order.contact_name} · {order.contact_phone}</p>
                  {order.comment && <p><strong>Comentario:</strong> {order.comment}</p>}
                  {order.status === 'pending' && (
                    <button className="btn-remove" type="button" disabled={actionId === order.id} onClick={() => cancel(order.id)}>
                      {actionId === order.id ? 'Cancelando…' : 'Cancelar pedido'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
