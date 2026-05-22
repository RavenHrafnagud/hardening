# CrediSmart Hardening

Aplicacion web para registrar equipos con hardening, conservar las llaves de BitLocker y asignar usuarios a equipos ya inscritos.

## Tecnologias

- Yarn
- Vite
- React
- TypeScript
- SQLite
- Node.js

## Flujo funcional

1. El frontend en `src/app` carga una SPA React.
2. El backend de Node en `server/http/server.ts` recibe peticiones y decide si devuelve datos de la API o archivos estáticos desde `dist`.
3. La persistencia está en SQLite local bajo `data/hardening.sqlite`.
4. Al arrancar por primera vez, la base se inicializa con datos de `src/hardening/seed/hardeningSeed.json`.

## Estructura y responsabilidades

### Backend

- `server/http/server.ts`
  - Punto de entrada del servidor Node.
  - Configura el router de rutas API.
  - Usa middleware de autenticación.
  - Sirve el frontend compilado cuando la ruta no es `/api`.

- `server/http/auth.ts`
  - Extrae el token Bearer de la cabecera Authorization.
  - Valida sesiones existentes.
  - Define los wrappers `withAccount` y `withAdmin` para proteger rutas.

- `server/http/requestParser.ts`
  - Lee el cuerpo de las peticiones HTTP.
  - Limita el tamaño del body a 1 MB.
  - Devuelve JSON ya parseado o lanza un error si el payload es demasiado grande.

- `server/http/response.ts`
  - Envía respuestas JSON con cabeceras correctas.
  - Centraliza el manejo de errores de la API.

- `server/http/staticFile.ts`
  - Carga archivos estáticos desde `dist`.
  - Usa `index.html` como fallback para rutas del frontend.
  - Añade cabeceras de cache para activos de cliente.

- `server/hardening-sqlite/HardeningSqliteDatabase.ts`
  - Controla el acceso a SQLite.
  - Crea el esquema si no existe.
  - Inserta la semilla inicial la primera vez que arranca.
  - Gestiona cuentas, sesiones, equipos y asignaciones.
  - Devuelve el modelo de dominio que usa el frontend.

### Frontend

- `src/app/App.tsx`
  - Inicializa la aplicación React y controla la sesión.

- `src/app/main.tsx`
  - Punto de arranque de Vite.

- `src/app/styles/global.css`
  - Estilos globales de la aplicación.

- `src/hardening/application/hardeningDashboard.ts`
  - Contiene la lógica de negocio usada por el dashboard.

- `src/hardening/presentation/`
  - Componentes visuales para el dashboard, formulario de equipos, tabla y métricas.

- `src/identity-access/presentation/`
  - Pantallas de login y administración de cuentas.

### Datos

- `src/hardening/seed/hardeningSeed.json`
  - Datos iniciales de equipos y asignaciones.

- `data/hardening.sqlite`
  - Archivo SQLite que guarda:
    - cuentas
    - sesiones
    - equipos
    - usuarios asignados

## Accesos locales

- Administrador: `admin` / `admin123`
- Usuario: `standard` / `standard123`

El administrador puede crear usuarios, cambiar credenciales y administrar equipos. El rol `standard` puede asignar usuarios a equipos no asignados.

## Comandos

```bash
yarn dev
yarn lint
yarn typecheck
yarn build
yarn start
```

- `yarn dev`: levanta la API y el frontend en modo desarrollo.
- `yarn build`: compila el backend y el frontend.
- `yarn start`: ejecuta el servidor compilado.

## Deployment

Para mover la aplicación a otro host, copia todo el proyecto y conserva la carpeta `data`.

- Si el servidor soporta Node.js, instala dependencias y ejecuta `yarn start`.
- Si no hay Node.js, sólo podrás alojar el frontend estático, pero la API no funcionará.

## Notas de mantenimiento

- `server/http`: maneja rutas y archivos estáticos.
- `server/hardening-sqlite`: maneja persistencia, semilla y operaciones de dominio.
- `src/hardening` y `src/identity-access`: lógica de negocio y UI.
