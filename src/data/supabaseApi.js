import { requireSupabase } from '../lib/supabase.js'

const productFields = 'id,name,description,category,price,image,alt,is_active'
const orderFields = 'id,order_number,client_id,contact_name,contact_phone,delivery_type,address,comment,total,status,is_active,created_at,order_items(id,product_id,product_name,quantity,unit_price,subtotal)'

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

const normalizeOrder = (order) => ({
  ...order,
  total: Number(order.total),
  order_items: (order.order_items || []).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    subtotal: Number(item.subtotal),
  })),
})

export async function getProducts({ includeInactive = false } = {}) {
  const client = requireSupabase()
  let query = client.from('products').select(productFields).order('category').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  return unwrap(await query).map((product) => ({ ...product, price: Number(product.price) }))
}

export async function getCurrentRole() {
  return unwrap(await requireSupabase().rpc('current_app_role')) || 'customer'
}

export async function getProfile(userId) {
  return unwrap(await requireSupabase()
    .from('profiles')
    .select('id,full_name,phone')
    .eq('id', userId)
    .single())
}

export async function saveProfile(userId, { fullName, phone }) {
  return unwrap(await requireSupabase()
    .from('profiles')
    .update({ full_name: fullName.trim(), phone: phone.trim() })
    .eq('id', userId)
    .select('id,full_name,phone')
    .single())
}

export async function createOrder(cart, details) {
  const items = cart.map((item) => ({ product_id: item.id, quantity: item.qty }))
  const data = unwrap(await requireSupabase().rpc('create_order', {
    p_items: items,
    p_contact_name: details.fullName.trim(),
    p_contact_phone: details.phone.trim(),
    p_delivery_type: details.deliveryType,
    p_address: details.deliveryType === 'delivery' ? details.address.trim() : null,
    p_comment: details.comment.trim() || null,
  }))
  return normalizeOrder(Array.isArray(data) ? data[0] : data)
}

export async function getOrders() {
  const data = unwrap(await requireSupabase()
    .from('orders')
    .select(orderFields)
    .order('created_at', { ascending: false }))
  return data.map(normalizeOrder)
}

export async function cancelOrder(orderId) {
  const data = unwrap(await requireSupabase().rpc('cancel_order', { p_order_id: orderId }))
  return normalizeOrder(Array.isArray(data) ? data[0] : data)
}

export async function changeOrderStatus(orderId, status) {
  const data = unwrap(await requireSupabase().rpc('change_order_status', {
    p_order_id: orderId,
    p_status: status,
  }))
  return normalizeOrder(Array.isArray(data) ? data[0] : data)
}

export async function createProduct(product) {
  const data = unwrap(await requireSupabase()
    .from('products')
    .insert(product)
    .select(productFields)
    .single())
  return { ...data, price: Number(data.price) }
}

export async function updateProduct(productId, product) {
  const data = unwrap(await requireSupabase()
    .from('products')
    .update(product)
    .eq('id', productId)
    .select(productFields)
    .single())
  return { ...data, price: Number(data.price) }
}

export async function deactivateProduct(productId) {
  const data = unwrap(await requireSupabase()
    .from('products')
    .update({ is_active: false })
    .eq('id', productId)
    .select(productFields)
    .single())
  return { ...data, price: Number(data.price) }
}

