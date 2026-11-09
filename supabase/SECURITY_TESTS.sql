-- Pruebas de aceptación para Texas Chicken SPA.
-- Ejecutar con dos usuarios de prueba distintos (A y B) desde una sesión autenticada.
-- Sustituye los UUID y tokens de prueba reales; no pegues tokens en repositorio.

-- 1. Usuario sin sesión: llamar RPC create_order debe fallar AUTH_REQUIRED.
-- 2. Payload manipulado: debe fallar INVALID_ORDER_FIELDS antes de insertar.
-- SELECT public.create_order('{"items":[{"product_id":"ranchera","quantity":1}],"total":0,"status":"entregado"}'::jsonb);
-- Resultado esperado: error INVALID_ORDER_FIELDS y cero filas nuevas en orders.

-- 3. Payload válido: debe crear pedido con precio de catálogo y estado pendiente.
-- SELECT public.create_order('{"items":[{"product_id":"ranchera","quantity":2}]}'::jsonb);
-- Resultado esperado: total = 72.00 y status = pendiente (con el catálogo semilla).

-- 4. Cantidad inválida, cero, negativa o mayor a 50: debe rechazarse sin crear pedido.
-- SELECT public.create_order('{"items":[{"product_id":"ranchera","quantity":0}]}'::jsonb);
-- SELECT public.create_order('{"items":[{"product_id":"ranchera","quantity":-1}]}'::jsonb);
-- SELECT public.create_order('{"items":[{"product_id":"ranchera","quantity":51}]}'::jsonb);

-- 5. Producto inexistente/no disponible: debe rechazarse sin crear pedido.
-- SELECT public.create_order('{"items":[{"product_id":"no-existe","quantity":1}]}'::jsonb);

-- 6. Lectura: A consulta orders y solo ve pedidos propios. B no puede leer el pedido de A.
-- 7. Escritura: un cliente normal no puede insertar orders/order_items directamente.
-- 8. Estado: un cliente normal no puede actualizar status; un miembro de staff sí puede.
-- La política de RLS y los permisos SQL son la verificación de estas restricciones.
