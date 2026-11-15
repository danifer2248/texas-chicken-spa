import { useEffect, useState } from 'react'
import { FormGroup } from './FormGroup.jsx'

const initialDetails = (user) => ({
  fullName: user?.user_metadata?.full_name || '',
  phone: '',
  deliveryType: 'pickup',
  address: '',
  comment: '',
})

export function CheckoutModal({ cart, user, order, submitting, error, onSubmit, onClose }) {
  const [values, setValues] = useState(() => initialDetails(user))
  const [fieldErrors, setFieldErrors] = useState({})
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, submitting])

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!values.fullName.trim()) nextErrors.fullName = 'Este campo es obligatorio.'
    if (!/^[0-9+ ()-]{7,30}$/.test(values.phone.trim()) || values.phone.replace(/\D/g, '').length < 7) {
      nextErrors.phone = 'Escribe un teléfono válido con al menos 7 dígitos.'
    }
    if (values.deliveryType === 'delivery' && !values.address.trim()) nextErrors.address = 'Escribe la dirección de entrega.'
    if (values.address.trim().length > 300) nextErrors.address = 'La dirección no puede superar 300 caracteres.'
    if (values.comment.length > 1000) nextErrors.comment = 'El comentario no puede superar 1000 caracteres.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(values)
  }

  return (
    <div className="modal active" role="presentation" onClick={() => { if (!submitting) onClose() }}>
      <section className="modal-content checkout-modal-content" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="Cerrar modal" onClick={onClose} disabled={submitting}>&times;</button>
        {order ? (
          <>
            <h2 id="order-title">¡Pedido confirmado! 🎉</h2>
            <p>Tu orden <strong style={{ color: 'var(--primary-red)' }}>{order.number}</strong> quedó registrada.</p>
            <div className="order-summary-box">
              <p><strong>Productos:</strong> {order.count} unidades</p>
              <p><strong>Total:</strong> Bs. {order.total}</p>
              <p><strong>Entrega:</strong> {order.deliveryType === 'delivery' ? 'Delivery' : 'Recoger en el local'}</p>
            </div>
            <p className="modal-next-steps">
              Te contactaremos al número que indicaste para coordinar el pedido. Puedes consultar su estado desde “Mis pedidos”.
            </p>
            <button className="btn-submit" type="button" onClick={onClose}>Entendido</button>
          </>
        ) : (
          <>
            <h2 id="order-title">Confirmar pedido</h2>
            <div className="order-summary-box">
              <ul className="checkout-items">
                {cart.map((item) => (
                  <li key={item.id}>{item.qty} × {item.name} <span>Bs. {(Number(item.price) * item.qty).toFixed(2)}</span></li>
                ))}
              </ul>
              <p><strong>Total estimado:</strong> Bs. {total.toFixed(2)}</p>
              <small>El servidor validará el precio final antes de guardar el pedido.</small>
            </div>
            <form onSubmit={submit} noValidate>
              {error && <p className="login-alert data-error" role="alert">{error}</p>}
              <FormGroup
                id="order-name"
                label="Nombre de contacto"
                value={values.fullName}
                onChange={update('fullName')}
                error={fieldErrors.fullName}
              />
              <FormGroup
                id="order-phone"
                label="Teléfono de contacto"
                type="tel"
                placeholder="Ej.: +591 70000000"
                value={values.phone}
                onChange={update('phone')}
                error={fieldErrors.phone}
              />
              <div className="form-group">
                <label htmlFor="delivery-type">Tipo de entrega</label>
                <select id="delivery-type" value={values.deliveryType} onChange={update('deliveryType')}>
                  <option value="pickup">Recoger en el local</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
              {values.deliveryType === 'delivery' && (
                <FormGroup
                  id="order-address"
                  label="Dirección de entrega"
                  placeholder="Calle, número y referencias"
                  value={values.address}
                  onChange={update('address')}
                  error={fieldErrors.address}
                />
              )}
              <div className="form-group">
                <label htmlFor="order-comment">Comentario (opcional)</label>
                <textarea id="order-comment" rows="3" maxLength="1000" value={values.comment} onChange={update('comment')} />
                {fieldErrors.comment && <span className="error-msg active" role="alert">{fieldErrors.comment}</span>}
              </div>
              <button className="btn-submit" type="submit" disabled={submitting || cart.length === 0}>
                {submitting ? 'Guardando pedido…' : 'Confirmar pedido'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
