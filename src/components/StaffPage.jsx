import { useCallback, useEffect, useState } from 'react'
import { categories } from '../data/products.js'
import {
  changeOrderStatus,
  createProduct,
  deactivateProduct,
  getOrders,
  getProducts,
  updateProduct,
} from '../data/supabaseApi.js'

const statuses = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const nextStatuses = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
}

const blankProduct = () => ({ name: '', description: '', category: categories[0]?.id || '', price: '', image: '', alt: '' })

function OrdersPanel() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState({})
  const [savingId, setSavingId] = useState('')

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

  useEffect(() => { load() }, [load])

  const saveStatus = async (order) => {
    const status = selectedStatus[order.id]
    if (!status) return
    setSavingId(order.id)
    setError('')
    try {
      const updated = await changeOrderStatus(order.id, status)
      setOrders((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))
      setSelectedStatus((current) => ({ ...current, [order.id]: '' }))
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingId('')
    }
  }

  return (
    <section aria-labelledby="staff-orders-title">
      <h2 id="staff-orders-title">Pedidos recibidos</h2>
      {error && <p className="data-state data-error" role="alert">{error}</p>}
      {loading && <p className="data-state" role="status">Cargando pedidos…</p>}
      {!loading && !error && orders.length === 0 && <p className="data-state">No hay pedidos.</p>}
      <div className="order-list">
        {orders.map((order) => {
          const options = nextStatuses[order.status] || []
          return (
            <article className="order-card" key={order.id}>
              <div className="order-card-heading">
                <div>
                  <h3>Pedido #TX-{order.order_number}</h3>
                  <time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString('es-BO')}</time>
                </div>
                <span className={`order-status status-${order.status}`}>{statuses[order.status] || order.status}</span>
              </div>
              <p><strong>Cliente:</strong> {order.contact_name} · {order.contact_phone}</p>
              <p><strong>Entrega:</strong> {order.delivery_type === 'delivery' ? `Delivery — ${order.address}` : 'Recoger en el local'}</p>
              {order.comment && <p><strong>Comentario:</strong> {order.comment}</p>}
              <ul className="order-lines">
                {order.order_items.map((item) => <li key={item.id}><span>{item.quantity} × {item.product_name}</span><span>Bs. {item.subtotal.toFixed(2)}</span></li>)}
              </ul>
              <p><strong>Total:</strong> Bs. {order.total.toFixed(2)}</p>
              {options.length > 0 && (
                <div className="status-controls">
                  <label htmlFor={`status-${order.id}`}>Cambiar estado</label>
                  <select
                    id={`status-${order.id}`}
                    value={selectedStatus[order.id] || ''}
                    onChange={(event) => setSelectedStatus((current) => ({ ...current, [order.id]: event.target.value }))}
                  >
                    <option value="">Seleccionar…</option>
                    {options.map((status) => <option value={status} key={status}>{statuses[status]}</option>)}
                  </select>
                  <button className="btn-submit" type="button" disabled={!selectedStatus[order.id] || savingId === order.id} onClick={() => saveStatus(order)}>
                    {savingId === order.id ? 'Guardando…' : 'Guardar estado'}
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CatalogPanel() {
  const [products, setProducts] = useState([])
  const [values, setValues] = useState(blankProduct)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProducts(await getProducts({ includeInactive: true }))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateField = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setError('')
    setNotice('')
  }

  const resetForm = () => {
    setValues(blankProduct())
    setEditingId('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const price = Number(values.price)
    if (!values.name.trim() || !values.description.trim() || !values.image.trim() || !values.category) {
      setError('Completa los campos obligatorios del producto.')
      return
    }
    if (values.name.trim().length > 120 || values.description.trim().length > 1000 || values.image.trim().length > 1000) {
      setError('Revisa la longitud del nombre, descripción o imagen.')
      return
    }
    if (!values.price.trim() || !Number.isFinite(price) || price < 0) {
      setError('El precio debe ser un número igual o mayor que cero.')
      return
    }
    const product = {
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      price,
      image: values.image.trim(),
      alt: values.alt.trim() || null,
    }
    setSaving(true)
    try {
      if (editingId) await updateProduct(editingId, product)
      else await createProduct(product)
      await load()
      resetForm()
      setNotice(editingId ? 'Producto actualizado.' : 'Producto creado.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = (product) => {
    setEditingId(product.id)
    setValues({
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      image: product.image,
      alt: product.alt || '',
    })
    setError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setActive = async (product) => {
    setActionId(product.id)
    setError('')
    setNotice('')
    try {
      if (product.is_active) await deactivateProduct(product.id)
      else await updateProduct(product.id, { is_active: true })
      await load()
      setNotice(product.is_active ? 'Producto desactivado; se conserva en el historial.' : 'Producto reactivado.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <section className="catalog-panel" aria-labelledby="catalog-title">
      <h2 id="catalog-title">Catálogo de productos</h2>
      <form className="staff-product-form" onSubmit={submit}>
        <h3>{editingId ? 'Editar producto' : 'Agregar producto'}</h3>
        {error && <p className="data-state data-error" role="alert">{error}</p>}
        {notice && <p className="data-state" role="status">{notice}</p>}
        <div className="staff-form-grid">
          <label>Nombre<input name="name" value={values.name} maxLength="120" onChange={updateField} required /></label>
          <label>Categoría<select name="category" value={values.category} onChange={updateField} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
          <label>Precio (Bs.)<input name="price" type="number" min="0" step="0.01" value={values.price} onChange={updateField} required /></label>
          <label>Imagen (URL)<input name="image" type="url" value={values.image} maxLength="1000" onChange={updateField} required /></label>
          <label className="staff-form-wide">Descripción<textarea name="description" value={values.description} maxLength="1000" onChange={updateField} rows="3" required /></label>
          <label className="staff-form-wide">Texto alternativo<input name="alt" value={values.alt} maxLength="300" onChange={updateField} /></label>
        </div>
        <div className="staff-actions">
          <button className="btn-submit" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}</button>
          {editingId && <button className="text-button" type="button" onClick={resetForm} disabled={saving}>Cancelar edición</button>}
        </div>
      </form>
      {loading && <p className="data-state" role="status">Cargando catálogo…</p>}
      {!loading && !error && products.length === 0 && <p className="data-state">No hay productos.</p>}
      <div className="staff-product-list">
        {products.map((product) => (
          <article className={`staff-product-row${product.is_active ? '' : ' inactive'}`} key={product.id}>
            <div>
              <h3>{product.name}</h3>
              <p>{product.category} · Bs. {product.price.toFixed(2)} · {product.is_active ? 'Activo' : 'Inactivo'}</p>
            </div>
            <div className="staff-actions">
              <button className="text-button" type="button" onClick={() => edit(product)}>Editar</button>
              <button className="text-button" type="button" disabled={actionId === product.id} onClick={() => setActive(product)}>
                {actionId === product.id ? 'Guardando…' : product.is_active ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function StaffPage({ role, roleLoading, loggedIn }) {
  const [panel, setPanel] = useState('orders')

  return (
    <main className="main-container">
      <section className="page-section data-page staff-page">
        <h1 className="section-title">Administración</h1>
        {!loggedIn && <p className="data-state">Inicia sesión para acceder al área de administración.</p>}
        {loggedIn && roleLoading && <p className="data-state" role="status">Comprobando permisos…</p>}
        {loggedIn && !roleLoading && !['staff', 'admin'].includes(role) && (
          <p className="data-state data-error" role="alert">Tu cuenta no tiene permisos para acceder a esta sección.</p>
        )}
        {loggedIn && !roleLoading && ['staff', 'admin'].includes(role) && (
          <>
            <div className="staff-tabs" role="tablist" aria-label="Secciones de administración">
              <button type="button" role="tab" aria-selected={panel === 'orders'} onClick={() => setPanel('orders')}>Pedidos</button>
              {role === 'admin' && <button type="button" role="tab" aria-selected={panel === 'catalog'} onClick={() => setPanel('catalog')}>Productos</button>}
            </div>
            {panel === 'orders' ? <OrdersPanel /> : role === 'admin' ? <CatalogPanel /> : null}
          </>
        )}
      </section>
    </main>
  )
}
