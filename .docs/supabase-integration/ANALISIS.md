# Análisis del modelo y la aplicación

## Fuente y alcance

Fuente: `.docs/TEXAS-CRUD/Texas_Chicken_Informe_CRUD_Seguridad.pdf` (40,970 bytes; siete páginas). El PDF es texto nativo de ReportLab, con tablas y relaciones dibujadas con vectores; se extrajo y revisó el texto de las páginas 1–6. La página 7 no contiene texto extraíble. No fue necesario rasterizar ni aplicar OCR. El PDF describe una **propuesta**, no un ER implementado ni roles ya configurados.

| Página | Contenido fuente relevante |
| --- | --- |
| 1 | El menú/carrito usa persistencia del navegador; login y confirmación son simulados. El informe separa observaciones actuales de propuestas. |
| 2 | Pedido propuesto: UUID, número visible, cliente opcional, productos, tipo de entrega/dirección condicionales, total, estado, fechas y activo. Catálogo observado: nombre, descripción, categoría, precio, imagen y alt. |
| 3 | Separar `Pedido` de `Linea_pedido`; línea con pedido, producto, cantidad, precio unitario y subtotal. Un producto puede aparecer en muchas líneas; un pedido tiene muchas líneas. Precio/subtotal/total deben calcularse del catálogo del servidor. |
| 4 | La matriz propone lectura de pedidos propios para cliente, CRUD de catálogo para administrador y lectura/actualización de pedidos por personal autorizado. Cancelación/desactivación lógica y conservación de historial. La matriz no fija qué roles ya existen. |
| 5 | El servidor debe validar identidad, cantidades, productos activos y total; no aceptar del cliente estado, activo, IDs, fechas ni total. Acceso a pedidos debe restringirse por propietario/rol. |
| 6 | Siguiente etapa propuesta: autenticación real, persistencia, validación del servidor, permisos y política de retención/anonimización. |

## Modelo implementado

Los nombres de tabla/columna y restricciones SQL detallados abajo son decisiones de implementación cuando el PDF no especifica tipos o nulabilidad. Moneda: bolivianos (Bs). Montos en `numeric(10,2)`, no coma flotante.

| Tabla | Atributos, tipo y reglas |
| --- | --- |
| `public.profiles` | `id uuid` PK y FK a `auth.users(id)`; `full_name text` obligatorio y no vacío; `phone text` opcional; `created_at`, `updated_at timestamptz` automáticos. Se crea al registrar la cuenta. El nombre/teléfono no son credenciales ni determinan roles. |
| `public.products` | `id uuid` PK generado; `name text` obligatorio y único; `description text` obligatorio; `category text` obligatorio; `price numeric(10,2)` obligatorio y no negativo; `image text` obligatorio; `alt text` nullable; `is_active boolean not null default true`; fechas automáticas. Los seis campos de catálogo vienen de `src/data/products.js`; `is_active` implementa la baja lógica propuesta. |
| `public.orders` | `id uuid` PK; `order_number bigint` único y generado por identidad; `client_id uuid` obligatorio FK a `auth.users(id)`; `delivery_type` restringido a `pickup`/`delivery`; `address text` nullable, obligatoria para delivery; `contact_phone text` obligatorio; `comment text` nullable; `total numeric(10,2)` generado por el servidor; `status` restringido a `pending`, `confirmed`, `preparing`, `delivered`, `cancelled`; `is_active boolean not null default true`; `created_at`, `updated_at timestamptz` automáticos. `client_id` no es nullable porque la aplicación exige sesión para comprar. |
| `public.order_items` | `id uuid` PK; `order_id uuid` FK a `orders(id)`; `product_id uuid` FK a `products(id)`; `product_name text` conserva el nombre al comprar; `quantity integer` entre 1 y 99; `unit_price numeric(10,2)` no negativo; `subtotal numeric(10,2)` calculado como cantidad × precio. Unicidad por `(order_id, product_id)`. |
| `private.user_roles` | `user_id uuid` PK/FK a `auth.users`; `role text` limitado a `staff`/`admin`. Esquema no expuesto a la API y sin grants a clientes. La asignación se hace desde SQL Editor como administradora del proyecto, nunca desde el frontend. Sin fila, la persona es cliente. |

Las relaciones son `auth.users 1—1 profiles`, `auth.users 1—N orders`, `orders 1—N order_items` y `products 1—N order_items`; así `orders` y `products` tienen una relación N—M resuelta por `order_items`. Las líneas se borran en cascada solo junto al pedido físico; una línea conserva su producto con FK restrictiva. Un usuario Auth con pedidos no se puede borrar físicamente; pedido y producto se cancelan/desactivan. No se implementa borrado de datos personales hasta que el negocio defina la retención legal/comercial.

Checkout es una única función transaccional: recibe IDs de producto y cantidades, comprueba sesión, rango y estado activo, ignora precios/totales/estado/IDs/fechas enviados desde el navegador, copia precio y nombre del catálogo y guarda pedido/líneas juntos. El backend fija `pending`, número, total y fechas. Si un producto deja de existir o la transacción falla, no queda un pedido parcial.

## Seguridad y alcance de permisos

El PDF advierte que la matriz CRUD no es por sí sola una política de seguridad. Para hacerla ejecutable se adopta este alcance concreto:

- `anon` y `authenticated`: lectura de productos activos; no reciben acceso a perfiles ni pedidos ajenos.
- Cliente autenticado: crear pedido por la función transaccional; leer solamente sus pedidos/líneas; cancelar solamente sus pedidos todavía pendientes por una función limitada; leer/actualizar su perfil. No puede cambiar precio, total, estado, número, activo ni propietario.
- `staff`: leer los pedidos necesarios y cambiar su estado, sin asignarse roles ni editar el catálogo.
- `admin`: permisos de staff y alta/edición/desactivación lógica de productos.
- Sin rol asignado no hay privilegios de personal. La interfaz puede ocultar páginas, pero RLS/funciones SQL son el control efectivo. Las líneas no tienen INSERT/UPDATE/DELETE directo desde la API.

El rol se mantiene en `private.user_roles` y se consulta mediante funciones SQL `SECURITY DEFINER` con `search_path` fijo. Solo una persona con privilegios de base de datos puede insertar o cambiar esos roles. No se guarda el rol en `user_metadata`, que el usuario podría editar.

## Correspondencia página → datos/CRUD → flujo → verificación

| PDF | Entidad y CRUD propuesto | Archivo/flujo actual y destino | Comprobación requerida |
| --- | --- | --- | --- |
| 2, 4 | Producto C/R/U/D lógico por admin; lectura pública de activos | `src/components/MenuPage.jsx`, `src/components/StaffPage.jsx` (`/admin`) | Probados lectura pública, alta/edición/baja lógica admin, rechazo a cliente/staff y rechazo de borrado físico. |
| 2, 4–6 | Perfil C en registro, R/U propio; sin borrado aislado | `src/components/AuthPage.jsx`, `public.profiles` | Probados trigger de perfil, actualización propia y denegación de acceso cruzado entre clientes. |
| 2–5 | Pedido C; cliente R propio; staff R/U estado; D lógico como cancelación | `src/App.jsx`, `src/components/CheckoutModal.jsx`, `src/components/OrderHistoryPage.jsx`, `src/components/StaffPage.jsx` | Probados total/número/estado del servidor, historial propio, rechazo de acceso/cancelación cruzados, cambio de estado staff y rechazo de transición inválida. |
| 3–5 | Líneas C transaccional, R por visibilidad del pedido; sin U/D aislado | RPC de checkout y `src/components/OrderHistoryPage.jsx` | Probados snapshot de producto/precio, aislamiento de líneas y rechazo de inserción directa del cliente. |
| 2, 4 | Tipo de entrega, dirección, contacto/comentario | `src/components/CheckoutModal.jsx` | Checkout exige contacto/teléfono; delivery requiere dirección, pickup no guarda dirección y el comentario es opcional. Reglas de base aplicadas. |

## Diferencias, decisiones y pendientes

- El código inicial no tenía backend/Supabase: `localStorage` guardaba carrito y una marca de login, y el checkout generaba un número aleatorio. La integración reemplazó la marca por `supabase.auth`; el carrito sigue guardado localmente por usuario y pedidos/perfiles viven en Supabase.
- La app exige login para añadir al carrito, por eso el vínculo cliente-pedido es obligatorio. No se habilitan compras anónimas que el flujo actual no soporta.
- El PDF menciona datos de contacto, dirección y comentario como propuestas, pero el checkout actual no los solicita. Se incluyen teléfono y dirección de entrega, se ofrece comentario opcional, y se conserva una copia del teléfono en el pedido. No se solicita dato de pago.
- El catálogo inicial se inserta de forma idempotente; menú, carrito y checkout usan los UUID persistentes de Supabase.
- La CLI autenticada encontró una sola organización, `Texas Chicken`, y un proyecto coincidente `texas-chicken-spa` (`wueuktufolitrkwpjlex`), activo y saludable en `us-west-2`. Se enlazó ese proyecto; `migration list --remote` y una consulta a `information_schema` confirmaron que antes de la migración no tenía historial ni tablas públicas. El esquema inicial ya está aplicado; el detalle comprobado está en `CHECKLIST.md`.
- El CLI de proyectos no mostró el plan ni el tamaño de cómputo del recurso existente. No se creó ningún proyecto, no se cambió el tamaño de cómputo ni se activaron servicios pagos. La aplicación usa Auth y Postgres existentes y no configura Storage, Functions, backups ni alta disponibilidad.
- La región `us-west-2` se conserva para no crear un recurso duplicado; la CLI actual sí ofrece `sa-east-1`, aunque no se migró una base ya creada.
- La prueba remota usó cuatro cuentas temporales con sesiones normales y cubrió 31 comprobaciones CRUD/RLS. Todas pasaron; la consulta posterior confirmó cero cuentas, roles, pedidos o productos temporales. La compilación limpia con Node 22 y la auditoría de dependencias también pasaron; ver `CHECKLIST.md`.
- Falta acordar retención/anonimización de datos personales; por ahora se restringe acceso y se prohíbe borrado físico desde la aplicación.

## Configuración local y remota

Crear `.env.local` (no compartir ni commitear) con:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

El proyecto enlazado es `texas-chicken-spa` (`wueuktufolitrkwpjlex`). `.env.local` contiene localmente la URL y clave publicable del proyecto y está ignorado por Git. La clave publicable/`anon` es apta para cliente solo con RLS correcto. Nunca usar `service_role`, claves secretas ni password de base de datos en `VITE_*`.

Tras registrar la primera cuenta de personal, asignarle `admin` manualmente en Supabase SQL Editor con una consulta de esta forma (reemplazar por el email real localmente):

```sql
insert into private.user_roles (user_id, role)
select id, 'admin' from auth.users where email = '<correo-del-administrador>'
on conflict (user_id) do update set role = excluded.role;
```

El endpoint SQL no se expone a usuarios web. La migración ya está aplicada al proyecto enlazado. Antes del deploy hay que configurar las variables de repositorio de GitHub y las URLs de Supabase Auth para el dominio Pages. La CLI no expuso el plan de facturación; no se creó ningún proyecto ni se cambiaron cómputo o servicios de pago.

