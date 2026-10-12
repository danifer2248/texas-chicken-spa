# Texas Chicken

Interfaz React del sitio Legacy Texas Chicken, ejecutada con Vite.


## Desarrollo

```sh
npm install
npm run dev
```

## Compilación

```sh
npm run build
```

## Rutas y despliegue

La aplicación usa navegación del lado del cliente y admite `/`, `/menu.html`, `/login.html` y `/registro.html` (también sus variantes sin `.html`). En el servidor de desarrollo y en `npm run preview`, Vite entrega `index.html` para las rutas de la aplicación. En producción, publica el contenido de `dist` en la raíz del dominio y configura el servidor estático para reescribir las rutas de la aplicación a `/index.html`; excluye `/api/` y los archivos estáticos existentes de esa regla. Por ejemplo, en Netlify se puede usar una regla de fallback `/* /index.html 200`.

Los comandos disponibles son `npm run dev`, `npm run build` y `npm run preview`. El proyecto no configura lint ni pruebas automatizadas.

El flujo `.github/workflows/deploy.yml` compila y publica el sitio en GitHub Pages al subir cambios a `main`. Para este repositorio, la URL será `https://danifer2248.github.io/texas-chicken-spa/`. En la primera publicación, selecciona **Settings → Pages → Build and deployment → GitHub Actions**. El flujo incluye `404.html` para que las rutas internas vuelvan a cargar la SPA.

