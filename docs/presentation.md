CrediSmart Hardening — Documentación completa de funcionamiento y despliegue

## 1. Paso a paso de cómo funciona esta página y sus componentes

### 1.1 Inicio de la aplicación

- El servidor se arranca desde `package.json` con:
  - `yarn dev` para desarrollo, que levanta la API y Vite juntos.
  - `yarn build` para compilar frontend y backend.
  - `yarn start` para ejecutar la versión compilada.
- En modo producción, el backend arranca desde `server/http/server.ts` compilado en `dist-server/server/http/server.js`.
- El puerto se define en el servidor por la línea:
  - `const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001)` en `server/http/server.ts`.

### 1.2 Backend HTTP y routing

- `server/http/server.ts` crea un servidor con `createServer` de Node.
- En cada petición se calcula el método y la ruta:
  - `GET /api/health`, `POST /api/auth/login`, `GET /api/hardening`, etc.
- Las rutas estáticas son manejadas por `server/http/staticFile.ts` cuando la URL no comienza con `/api/`.
- El servidor distingue rutas fijas y también rutas dinámicas de actualización con expresiones regulares:
  - `/api/accounts/:id`
  - `/api/equipments/:id`
  - `/api/assignments/:id`
- Si la ruta empieza con `/api/` y no existe, devuelve `404`.

### 1.3 Autenticación y autorización

- `server/http/auth.ts` define dos wrappers:
  - `withAccount(database, handler)` exige un token Bearer en `Authorization`.
  - `withAdmin(database, handler)` exige además `request.account.role === 'admin'`.
- El token se extrae de la cabecera `Authorization: Bearer <token>`.
- Si la sesión es inválida o expirada, el servidor responde con `401`.
- Si un usuario no-admin accede a rutas admin, se responde `403`.

### 1.4 Lectura y validación de cuerpo JSON

- `server/http/requestParser.ts` lee la petición en streaming.
- Limita el tamaño a 1 MB con `MAX_BODY_SIZE = 1024 * 1024`.
- Devuelve errores específicos:
  - `RequestBodyTooLargeError` → `413 Request Entity Too Large`.
  - `RequestBodyParseError` → `400 Bad Request`.
- Si la petición no tiene cuerpo, devuelve `{}`.

### 1.5 Respuestas JSON y manejo de errores

- `server/http/response.ts` centraliza:
  - `sendJson(response, status, payload)` para respuestas correctas.
  - `sendRouteError(response, error)` para errores de ruta y operación.
- Esto garantiza que todas las respuestas de API sean JSON consistentes.

### 1.6 Servir archivos estáticos

- `server/http/staticFile.ts` sirve archivos desde `dist`.
- Usa `resolve(process.cwd(), 'dist')` para hallar la carpeta de producción.
- Si la ruta solicitada no existe y no es un asset válido, devuelve `index.html`.
- Las cabeceras de cache son:
  - `no-cache` para `.html`
  - `public, max-age=31536000, immutable` para assets estáticos.

### 1.7 Persistencia SQLite

- `server/hardening-sqlite/HardeningSqliteDatabase.ts` es la capa de datos.
- Crea el directorio `data` si no existe y abre `data/hardening.sqlite`.
- Lee la semilla inicial de `src/hardening/seed/hardeningSeed.json`.
- Ejecuta `createSchema()` y `seedIfNeeded()` al iniciar.
- Ofrece funciones clave:
  - `login(username, password)`
  - `authenticate(token)`
  - `getDatabase()`
  - `createEquipment`, `updateEquipment`
  - `assignUser`, `updateAssignedUser`
  - `getAccountDirectory`, `createUser`, `updateAccountCredentials`
- También limpia sesiones expiradas periódicamente.

### 1.8 Frontend y flujo de usuario

- El frontend está en `src/app` y `src/hardening`.
- `src/app/App.tsx` controla la sesión y llama al cliente de API.
- `src/hardening/infrastructure/hardeningApiClient.ts` construye las solicitudes con `Authorization: Bearer $TOKEN`.
- `src/hardening/presentation/DashboardScreen.tsx` muestra:
  - métricas generales,
  - tabla de equipos,
  - formularios de edición.
- Componentes importantes:
  - `EquipmentTable.tsx` muestra la lista y botón de editar.
  - `EditEquipmentForm.tsx` edita campos de un equipo.
  - `EditAssignedUserForm.tsx` edita la información del usuario asignado.

### 1.9 Flujo completo de uso

1. El usuario ingresa credenciales en el frontend.
2. El frontend llama a `POST /api/auth/login`.
3. El servidor valida con `HardeningSqliteDatabase.login()` y devuelve token.
4. El frontend guarda el token y llama `GET /api/hardening`.
5. El servidor devuelve snapshot con equipos y asignaciones.
6. El usuario edita un equipo o asignación.
7. El frontend envía `PATCH /api/equipments/:id` o `PATCH /api/assignments/:id`.
8. El servidor valida el token, actualiza SQLite y responde con el registro actualizado.
9. El frontend refresca la vista y muestra los cambios.

## 2. Pasos a seguir para trasladar esta página de local a otro host

### 2.1 Preparar el código localmente

1. Clona o copia el repositorio en tu máquina local.
2. Ejecuta `yarn install`.
3. Genera la versión de producción:
   - `yarn build`
   - Esto produce el frontend final en `dist` y el backend compilado en `dist-server`.
4. Comprueba localmente con `yarn start`.

### 2.2 Transferir archivos al host

Debes copiar al host al menos:
- todo el repo o al menos las siguientes carpetas:
  - `dist-server/`
  - `dist/`
  - `server/` si quieres compilar en el host
  - `data/` (archivo SQLite)
  - `package.json` y `yarn.lock` si vas a instalar dependencias en el host
- Si ya compilas localmente, no necesitas `src/` en el host de producción, pero sí `dist-server/`, `dist/`, y `data/`.

### 2.3 Configurar el host

1. Instala Node.js (preferiblemente versión 20 o superior).
2. Instala dependencias en el host:
   - `yarn install --production`
3. Ajusta el puerto si es necesario:
   - `API_PORT=3001 yarn start`
   - o `PORT=3001 yarn start`
4. Asegúrate de que el servidor tenga permiso de escritura en `data/`.
5. Si usas proxy inverso (Nginx, Apache), configúralo para redirigir el tráfico HTTP al puerto definido.

### 2.4 Verificar el arranque

- Ejecuta `yarn start` y revisa el log:
  - `API y frontend listos en http://localhost:3001`
  - `Base SQLite: <ruta>`
- Comprueba que puedes acceder al sitio y que la API responde.
- Si existe un frontend separado, revisa que `dist/index.html` se sirva correctamente.

## 3. Archivos o líneas de código que debo modificar al mover mi página a otro host

### 3.1 Cambios típicos de configuración

- `server/http/server.ts`
  - Línea clave: `const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001)`
  - Aquí no es necesario cambiar el código si defines `API_PORT` o `PORT` en el host.
  - Si quieres un puerto fijo diferente, puedes modificar esta línea.

- `vite.config.js`
  - Línea clave: `'/api': `http://localhost:${apiPort}``
  - Esto aplica solo en desarrollo local.
  - No necesitas cambiarlo para producción con `yarn start`.

- `server/http/staticFile.ts`
  - Línea clave: `const publicDirectory = resolve(process.cwd(), 'dist')`
  - Si ejecutas desde una carpeta diferente a la raíz del proyecto, el código espera `dist` relativo al directorio de trabajo.
  - Para un host que ejecute el servidor desde otra ruta, debes ajustar esta ruta o asegurarte de iniciar desde la raíz del proyecto.

- `server/hardening-sqlite/HardeningSqliteDatabase.ts`
  - Líneas clave:
    - `const dataDirectory = resolve(process.cwd(), 'data')`
    - `const databasePath = resolve(dataDirectory, 'hardening.sqlite')`
  - Si deseas almacenar SQLite en otra carpeta, es aquí donde debes modificar la ruta.
  - Actualmente el `data` se ubica en el directorio de trabajo actual.

### 3.2 Cambios mínimos recomendados para producción

- Si tu host no permite ejecutar el servidor desde la raíz, agrega soporte de variable de entorno para `DATA_DIR` o `DIST_DIR` en `server/http/staticFile.ts` y `HardeningSqliteDatabase.ts`.
- Si usas un dominio con HTTPS, no es necesario modificar el código: el servidor local sigue oyendo en el puerto interno y el proxy inverso maneja HTTPS.

### 3.3 Archivos que no es necesario modificar

- `src/app` y los archivos de React (`src/hardening`, `src/identity-access`) no requieren cambios para mover el host.
- La lógica de negocio y los endpoints tampoco cambian; solo el entorno de ejecución.

## 4. Requisitos que necesita el host a donde deseo trasladar mi página

### 4.1 Requisitos de software

- Node.js instalado (versión moderna compatible con ESM, idealmente 20+).
- `yarn` o `npm` para gestionar dependencias.
- Si quieres ejecutar en producción:
  - Node.js solo es suficiente para `yarn start`.
  - Si usas `yarn dev`, también necesitas `tsx` y `concurrently`.
- Si el host tiene un servidor web externo (Nginx/Apache), debe poder enrutar tráfico al puerto del servidor Node.

### 4.2 Requisitos de sistema de archivos

- Permisos de lectura/escritura en la carpeta `data/`.
- Espacio suficiente para el archivo SQLite (`data/hardening.sqlite`) y para los assets compilados en `dist/`.
- Acceso persistente para que el archivo SQLite conserve los datos entre reinicios.

### 4.3 Requisitos de red

- Puerto TCP disponible para el servidor Node (`3001` por defecto, o el que configures con `API_PORT`).
- Si usas un dominio, el DNS debe apuntar al host y el proxy inverso debe reenviar al puerto interno.

### 4.4 Requisitos de seguridad

- Si tu host expone la aplicación a Internet, utiliza un proxy o balanceador con HTTPS.
- Protege el acceso al archivo `data/hardening.sqlite`.
- Si despliegas en un entorno compartido, verifica que solo tu aplicación pueda escribir en `data/`.

## 5. Resumen de la revisión

- Esta página es una SPA React que consume una API HTTP propia de Node.
- El backend sirve la aplicación compilada desde `dist` y maneja la API desde `/api`.
- La persistencia es SQLite en `data/hardening.sqlite`, creada automáticamente en el primer arranque.
- Para mover a otro host, el cambio más importante es mantener `dist/`, `data/` y definir `API_PORT` o `PORT`.
- El código actual ya está diseñado para producción con `yarn build` y `yarn start`.

---

### Archivos clave para revisión rápida

- `server/http/server.ts` — router y puerto
- `server/http/auth.ts` — autenticación y autorización
- `server/http/requestParser.ts` — parseo y límites de body
- `server/http/staticFile.ts` — servidor de archivos estáticos
- `server/hardening-sqlite/HardeningSqliteDatabase.ts` — base de datos y semilla
- `vite.config.js` — proxy de desarrollo
- `package.json` — scripts y dependencias
