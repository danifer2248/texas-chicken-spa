# Configuración de Supabase

1. Crea un proyecto en https://supabase.com/dashboard.
2. Abre **SQL Editor** y ejecuta todo el contenido de `supabase/schema.sql`.
3. En **Project Settings > API**, copia la **Project URL** y la **Publishable key**.
4. En la raíz del proyecto, copia `.env.example` como `.env.local` y completa:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. En la terminal ejecuta `npm install` y después `npm run dev`.
6. En Supabase > Authentication > Providers, confirma que Email esté habilitado. Para pruebas rápidas puedes desactivar temporalmente la confirmación de correo; para producción conviene mantenerla habilitada.
7. Crea una cuenta desde la aplicación. Los pedidos solo se aceptan con sesión autenticada.

## Personal autorizado

La tabla `staff_members` no permite altas desde el navegador. Para autorizar a un trabajador, primero crea su cuenta y copia su UUID desde Authentication > Users. Después, desde SQL Editor, ejecuta como administrador:

```sql
insert into public.staff_members (user_id)
values ('UUID-REAL-DEL-USUARIO');
```

Solo ese personal podrá actualizar la columna `status` de los pedidos. No uses metadatos públicos del perfil para decidir quién es personal.

## Seguridad de las claves

La Publishable key está diseñada para estar en el frontend y no sustituye a RLS. Nunca incluyas la contraseña de PostgreSQL, una secret key o `service_role` en archivos `VITE_` ni en el navegador.

La sesión se conserva en el navegador para que el usuario no tenga que iniciar sesión en cada recarga. La autorización no depende de un booleano local: Supabase valida el JWT y PostgreSQL aplica las políticas RLS en cada consulta.

## Despliegue en GitHub Pages

GitHub Pages es hosting estático. Configura las mismas variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como GitHub Actions Secrets/Variables y adapta el workflow de despliegue para pasarlas al paso de build. No publiques `.env.local`.
