# Texas Chicken

Interfaz React con Vite para el sitio Texas Chicken SPA. El menú, autenticación, pedidos y administración usan Supabase cuando se configura el proyecto.

## Requisitos e instalación

Usa Node.js 22.12 o posterior (Vite y la versión instalada de Supabase JS requieren un runtime moderno).

```sh
npm install
Copy-Item .env.example .env.local # PowerShell; en macOS/Linux: cp .env.example .env.local
```

Completa `.env.local` con la URL del proyecto y su clave `publishable` o `anon`. El archivo real está ignorado por Git. No pongas una clave `service_role`, una clave secreta ni la contraseña de Postgres en variables `VITE_*`.

## Proyecto Supabase y migraciones

La CLI se instala localmente como dependencia de desarrollo. Desde la raíz:

```sh
npx supabase --version
npx supabase login
npx supabase orgs list
npx supabase projects list
```

Consulta la lista antes de crear un proyecto. Si no existe uno para esta aplicación y hay cupo del plan gratuito, inicializa/enlaza el CLI con la organización y referencia correctas:

```sh
npx supabase init
npx supabase projects create "texas-chicken-spa" --org-id "<ORG_ID>" --region "<REGION>"
npx supabase link --project-ref "<PROJECT_REF>"
npx supabase db push --dry-run --remote
npx supabase db push --remote
npx supabase migration list --remote
```

Sigue el prompt seguro del CLI para la contraseña de base de datos. Revisa que el nombre y la referencia mostrados por CLI sean los de esta aplicación antes de enlazar o aplicar cambios. La migración `supabase/migrations/20261115000000_initial_schema.sql` crea el esquema, las políticas RLS, RPCs transaccionales y el catálogo inicial. Los productos se insertan de forma idempotente en esa migración; no se depende de que `db push` ejecute `seed.sql`.

El frontend solo accede con la clave publicable y RLS. Supabase Auth requiere habilitar correo/contraseña y permitir el callback de la app en la configuración de URLs de Auth. El flujo de registro muestra un aviso para confirmar el correo si el proyecto exige confirmación.

Después de registrar la cuenta que administrará el catálogo, asígnale el rol desde Supabase SQL Editor como responsable del proyecto (sustituye el correo localmente):

```sql
insert into private.user_roles (user_id, role)
select id, 'admin' from auth.users where email = '<correo-del-administrador>'
on conflict (user_id) do update set role = excluded.role;
```

La interfaz no puede crear ni modificar roles. `staff` puede gestionar el estado de pedidos; `admin` también administra productos.

Para desplegar en GitHub Pages, define las variables de repositorio `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con valores publicables. No configures claves privadas en el bundle.

## Desarrollo y compilación

```sh
npm run dev
npm run build
npm run preview
```

La navegación admite `/`, `/menu.html`, `/login.html`, `/registro.html`, `/pedidos.html` y `/admin.html` (también sus variantes sin `.html`). En producción, configura el fallback de SPA a `/index.html`, excluyendo los archivos estáticos existentes. El workflow de GitHub Pages copia `index.html` como `404.html`.

El proyecto no define lint ni pruebas automatizadas. La lista de verificaciones realizadas y pendientes de Supabase está en [.docs/supabase-integration/CHECKLIST.md](.docs/supabase-integration/CHECKLIST.md); el alcance y las decisiones del modelo, en [.docs/supabase-integration/ANALISIS.md](.docs/supabase-integration/ANALISIS.md).
