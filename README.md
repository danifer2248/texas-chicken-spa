# Texas Chicken

Interfaz React con Vite para el sitio Texas Chicken SPA. El menú, autenticación, pedidos y administración usan Supabase cuando se configura el proyecto.

## Requisitos e instalación

Usa Node.js 22.12 o posterior (Vite y la versión instalada de Supabase JS requieren un runtime moderno).

```sh
npm install
Copy-Item .env.example .env.local # PowerShell; en macOS/Linux: cp .env.example .env.local
```

Completa `.env.local` con la URL del proyecto y su clave `publishable` o `anon`. El archivo real está ignorado por Git. No pongas una clave `service_role`, una clave secreta ni la contraseña de Postgres en variables `VITE_*`.

En Supabase, abre el proyecto existente. Copia la **Project URL** desde **Project Settings → API** y la clave **Publishable** (o `anon` legacy) desde **Project Settings → API Keys**. Colócalas así en `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Reinicia `npm run dev` después de cambiar las variables. No uses una clave `secret` o `service_role`.

## Proyecto Supabase y migraciones

La CLI se instala localmente como dependencia de desarrollo. Para enlazar y revisar el proyecto existente (no crees otro ni apliques la migración inicial a ciegas):

```sh
npx supabase --version
npx supabase login
npx supabase projects list
npx supabase link --project-ref "<PROJECT_REF>"
npx supabase migration list --remote
```

Comprueba en el Dashboard que el esquema esperado ya existe antes de considerar cualquier migración. La migración inicial crea tablas, políticas y RPCs y no debe ejecutarse sobre datos existentes sin comparar el esquema primero. No se hicieron cambios a la base de datos desde este entorno.

La migración `supabase/migrations/20261115000000_initial_schema.sql` define el esquema, las políticas RLS, RPCs transaccionales y el catálogo inicial para una instalación compatible. No la apliques al proyecto existente sin revisar antes su historial y comparar las tablas y funciones.

El frontend solo accede con la clave publicable y RLS. En **Authentication → Providers → Email**, habilita Email y el registro por correo/contraseña. Define la longitud mínima de contraseña como 8. En **Authentication → URL Configuration**, usa `http://localhost:5173/` como Site URL durante desarrollo y permite como Redirect URLs `http://localhost:5173/**` y `https://danifer2248.github.io/texas-chicken-spa/**`. Si se activa la confirmación de correo, configura SMTP para entrega fiable; el formulario avisa que debe confirmarse el correo. El perfil se inserta automáticamente mediante el trigger `on_auth_user_created`; no hace falta habilitar inserciones de perfil desde el navegador.

Después de registrar la cuenta que administrará el catálogo, asígnale el rol desde Supabase SQL Editor como responsable del proyecto (sustituye el correo localmente):

```sql
insert into private.user_roles (user_id, role)
select id, 'admin' from auth.users where email = '<correo-del-administrador>'
on conflict (user_id) do update set role = excluded.role;
```

La interfaz no puede crear ni modificar roles. `staff` puede gestionar el estado de pedidos; `admin` también administra productos.

Para desplegar en GitHub Pages, crea las variables de repositorio `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings → Secrets and variables → Actions → Variables**. El workflow ya las inyecta durante `npm run build`. La URL y clave publicable son visibles en el bundle del navegador por diseño; nunca coloques claves `secret`, `service_role` ni contraseñas en esas variables.

## Desarrollo y compilación

```sh
npm run dev
npm run build
npm run preview
```

La navegación admite `/`, `/menu.html`, `/login.html`, `/registro.html`, `/pedidos.html` y `/admin.html` (también sus variantes sin `.html`). En producción, configura el fallback de SPA a `/index.html`, excluyendo los archivos estáticos existentes. El workflow de GitHub Pages copia `index.html` como `404.html`.

El proyecto no define lint ni pruebas automatizadas. La lista de verificaciones realizadas y pendientes de Supabase está en [.docs/supabase-integration/CHECKLIST.md](.docs/supabase-integration/CHECKLIST.md); el alcance y las decisiones del modelo, en [.docs/supabase-integration/ANALISIS.md](.docs/supabase-integration/ANALISIS.md).
