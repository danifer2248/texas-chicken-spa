# Integración Supabase — checklist

## Verificación realizada

- [x] Comparar con la imagen adjunta “Cambio sugerido”: cuenta obligatoria; Cuenta `1—0..N` Pedido; Pedido `1—1..N` Línea; Producto `1—0..N` Línea.
- [x] Revisar el proyecto y el PDF `Texas_Chicken_Informe_CRUD_Seguridad.pdf` (40,970 bytes, siete páginas) y documentar el mapeo en [ANALISIS.md](ANALISIS.md).
- [x] Reutilizar el proyecto existente `texas-chicken-spa` (`wueuktufolitrkwpjlex`), activo en `us-west-2`, y enlazar la CLI. No se creó un proyecto duplicado ni se modificó el cómputo. La CLI no mostró el plan de facturación.
- [x] Aplicar `supabase/migrations/20261115000000_initial_schema.sql`. `npx supabase migration list --remote` confirma que esa versión está aplicada.
- [x] Verificar el esquema real con `npx supabase db query --remote --read-only --yes --file .docs/supabase-integration/verify-order-model.sql`: FK/`NOT NULL` de propietario y líneas; `status NOT NULL DEFAULT 'pending'`; `total numeric(14,2) NOT NULL`; `unit_price numeric(10,2) NOT NULL`; subtotal generado; RLS activo en las cuatro tablas; privilegios directos `authenticated` para `orders`: SELECT sí, INSERT/UPDATE/DELETE no. El query también confirma que `create_order` es `SECURITY DEFINER`, lee precio vigente y suma subtotales.
- [x] Integrar Supabase Auth, catálogo, carrito por usuario, checkout transaccional, historial de pedidos y consola de personal en React. SDK centralizado en `src/lib/supabase.js`; `.env.local` está ignorado por Git.
- [x] Probar CRUD y RLS con cuatro cuentas temporales y sesiones normales de cliente/staff/admin: 31 comprobaciones generales pasaron, incluidas autorización cruzada, cálculo server-side, flujo de estados, borrado lógico y rechazo de borrado físico. Se limpiaron cuentas, roles, pedidos, líneas y producto temporales.
- [x] Ejecutar la prueba enfocada `powershell -NoProfile -ExecutionPolicy Bypass -File .docs/supabase-integration/verify-order-security.ps1`: pasaron 8 comprobaciones con una cuenta cliente autenticada. Falsificar total/estado al insertar o actualizar fue rechazado; `change_order_status` rechazó al cliente; el RPC rechazó un precio de línea enviado por el cliente. El pedido válido guardó precio del catálogo, subtotal, total, propietario, número y estado pending. El script borró los datos temporales y confirmó cero remanentes.
- [x] Verificar en el esquema remoto las relaciones de la imagen: `orders.client_id → auth.users.id` (`NOT NULL`, `ON DELETE RESTRICT`); `order_items.order_id → orders.id` (`NOT NULL`, `ON DELETE CASCADE`); `order_items.product_id → products.id` (`NOT NULL`, `ON DELETE RESTRICT`). La consulta final confirmó cuatro tablas públicas con RLS y 14 productos activos.
- [x] Verificar instalación limpia con `npm ci` y build de producción con Node 22. El build transformó 79 módulos. `npm audit` reportó cero vulnerabilidades después de actualizar dependencias compatibles en el lockfile.
- [x] Documentar instalación y operación en `README.md`, incluido el procedimiento manual para asignar el primer rol `admin`.

## Contraste de campos y cardinalidades

- `Cuenta autenticada 1—0..N Pedido`: `orders.client_id` obligatorio apunta a `auth.users.id`; la app requiere sesión para comprar.
- `Pedido 1—1..N Línea`: cada línea tiene `order_id NOT NULL`; el RPC solo crea pedidos con entre 1 y 50 líneas. El cliente no recibe permiso de escritura directa sobre ninguna de las dos tablas.
- `Producto 1—0..N Línea`: cada línea tiene `product_id NOT NULL`; la FK impide una línea huérfana. El producto puede aparecer en cero o muchas líneas; no se borra físicamente si tiene historial.
- `numero_pedido` corresponde a `orders.order_number` (`bigint IDENTITY ALWAYS UNIQUE`); `estado` a `status` (`NOT NULL DEFAULT pending` y restricción de estados); `total_calculado` a `total` (`numeric(14,2) NOT NULL`); `fecha_creacion` a `created_at`.
- `precio_vigente` corresponde a `products.price`. `precio_unitario_aplicado` corresponde a `order_items.unit_price` (`numeric(10,2) NOT NULL`), copiado al pedido junto con el nombre vigente.
- El `subtotal` adicional no aparece en la imagen: se genera en la base a partir de cantidad × precio aplicado. `information_schema` informa `is_nullable=YES` para la columna generada, pero ambos operandos son `NOT NULL` y el cliente no la puede escribir.

### Archivos y comandos de verificación

- DDL remoto: `supabase/migrations/20261115000000_initial_schema.sql`.
- RPC/datos desde el cliente: `src/data/supabaseApi.js`; checkout: `src/components/CheckoutModal.jsx`; lectura de pedidos: `src/components/OrderHistoryPage.jsx`.
- Inspección estructural repetible (solo lectura): `npx supabase db query --remote --read-only --yes --file .docs/supabase-integration/verify-order-model.sql`.
- Ataques con sesión cliente y limpieza automática: `powershell -NoProfile -ExecutionPolicy Bypass -File .docs/supabase-integration/verify-order-security.ps1`.
- Estado de migraciones: `npx supabase migration list --remote`.

## CRUD por entidad

| Entidad / operación | Comportamiento | Estado y evidencia |
| --- | --- | --- |
| `products` — Crear | Admin crea productos desde `/admin` | [x] API/RLS: permitido a admin; denegado a clientes y staff. |
| `products` — Leer | Menú público muestra productos activos; admin puede consultar el catálogo para administrarlo | [x] Lectura pública, ocultamiento y reactivación probados. |
| `products` — Actualizar | Admin edita nombre, descripción, categoría, precio e imagen | [x] Admin permitido; cliente y staff denegados. |
| `products` — Eliminar | Baja lógica con `is_active=false`; conserva historial | [x] Producto oculto del catálogo y reactivable; borrado físico denegado. |
| `profiles` — Crear | Trigger de Auth crea el perfil | [x] Probado al crear sesiones temporales. |
| `profiles` — Leer | Cliente lee su perfil; staff puede leer perfiles para atención | [x] RLS permite propietario/staff y deniega lectura cruzada entre clientes; el acceso staff no se probó aparte. |
| `profiles` — Actualizar | Cliente actualiza su nombre/teléfono, no el UUID | [x] Actualización propia permitida; actualización cruzada denegada. |
| `profiles` — Eliminar | No se ofrece eliminación individual desde la app | [x] No aplica; falta acordar retención/anonimización del negocio. |
| `orders` — Crear | Checkout autenticado llama RPC; servidor valida cantidades y productos activos y calcula total, número y estado | [x] Probado con precios alterados en entrada: total y estado salen del servidor. |
| `orders` — Leer | Cliente ve sus pedidos; staff/admin ve pedidos de atención | [x] Historial propio y lectura staff probados; acceso de otro cliente denegado. |
| `orders` — Actualizar | Staff/admin avanzan estados permitidos; cliente solo cancela su pedido pendiente | [x] Transiciones válidas y rechazo de transición inválida probados. |
| `orders` — Eliminar | Cancelación lógica; se conserva el pedido | [x] Cliente cancela su pedido pendiente; no se ofrece borrado físico desde la API. |
| `order_items` — Crear | Checkout crea líneas y precio/nombre snapshot dentro de la transacción | [x] Snapshot y rechazo de inserción directa del cliente probados. |
| `order_items` — Leer | RLS permite las líneas solo cuando el solicitante puede leer el pedido | [x] Propietario permitido; lectura cruzada denegada. |
| `order_items` — Actualizar | No se editan líneas de un pedido confirmado | [x] No aplica como operación independiente; sin privilegios directos para clientes. |
| `order_items` — Eliminar | No se borran líneas individualmente; se conservan al cancelar | [x] No aplica como operación independiente; sin privilegios directos para clientes. |

## Pendientes de configuración del propietario

1. En GitHub, crear las variables de repositorio `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` antes del próximo despliegue de Pages. El workflow ya las consume; no se configuraron en GitHub desde este entorno.
2. En Supabase Auth, habilitar correo/contraseña y configurar Site URL y Redirect URLs para el dominio final de Pages.
3. Registrar la cuenta real administradora y asignar `admin` en SQL Editor siguiendo el ejemplo de `README.md`. No se asignaron roles a cuentas reales.
4. Definir la política comercial/legal de conservación o anonimización de datos personales.
5. El CLI no expuso el plan del proyecto existente. No se crearon recursos, no se modificó el cómputo y no se activaron servicios de pago.

## Pruebas que faltan

- Recorrer las pantallas en navegador con el dominio final y configuración real de Auth/Pages; la verificación actual probó API/RLS y el build, no automatización visual de interfaz.
- Probar por separado el acceso permitido de staff a perfiles; la política está definida, y se comprobó el aislamiento entre clientes.
- Incorporar los dos comandos de verificación a CI o a una suite automatizada permanente; hoy son scripts manuales y requieren la CLI enlazada/autenticada.

## Entorno de compilación

El proyecto requiere Node.js `>=22.12.0`; el Node del entorno era `19.7.0`. La instalación limpia y el build se verificaron con Node `22.23.5`. No hay suite automatizada de pruebas ni se hizo una comprobación visual en navegador.

