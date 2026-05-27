# CrediSmart Hardening

Aplicacion web para registrar equipos con hardening, guardar llaves BitLocker y asignar usuarios a equipos.

La aplicacion tiene frontend React, backend Node.js y base de datos SQLite local. Los datos no viven en el navegador: se guardan en `data/hardening.sqlite`.

## Requisitos

- Node.js 24 o superior.
- Yarn 1.x.
- Un host que pueda ejecutar procesos Node.js si quieres usar login, SQLite y API.

## Usuarios iniciales

- Administrador: `admin` / `admin123`
- Usuario: `standard` / `standard123`

Existe un solo rol administrador. El administrador puede crear usuarios, cambiar credenciales, crear/editar equipos, ver llaves BitLocker y exportar la base en JSON o Excel. Los usuarios pueden asignar usuarios a equipos disponibles y editar datos de asignaciones.

## Estructura

- `src/app`: entrada React, estado de sesion y estilos globales.
- `src/hardening`: dominio de equipos, asignaciones, BitLocker, dashboard y API client.
- `src/identity-access`: login, usuarios, roles y gestion de credenciales.
- `server/http`: servidor HTTP, autenticacion, respuestas, parseo de requests y archivos estaticos.
- `server/hardening-sqlite`: persistencia SQLite, validaciones del dominio y semilla inicial.
- `data/hardening.sqlite`: base de datos real de produccion o desarrollo.

## Comandos locales

```bash
yarn install
yarn dev
```

`yarn dev` levanta:

- Frontend Vite: `http://localhost:5173`
- API Node/SQLite: `http://localhost:3001`

Otros comandos utiles:

```bash
yarn lint
yarn typecheck
yarn build
yarn start
```

`yarn build` genera:

- `dist`: frontend compilado.
- `dist-server`: backend compilado.

`yarn start` ejecuta el backend compilado y sirve tambien el frontend desde `dist`.

## Variables de entorno

- `API_PORT`: puerto donde corre la API y el servidor compilado. Por defecto `3001`.
- `PORT`: alternativa usada si no defines `API_PORT`.

Ejemplo:

```bash
API_PORT=8080 yarn start
```

## Datos y respaldos

La base se crea automaticamente en `data/hardening.sqlite` si no existe. Si el archivo ya existe, se reutiliza y conserva los datos.

Para hacer backup:

```bash
cp data/hardening.sqlite data/hardening.backup.sqlite
```

Para mover la aplicacion a otro host conservando datos, mueve tambien:

```text
data/hardening.sqlite
```

Si no copias ese archivo, el nuevo host arrancara con la semilla inicial de `src/hardening/seed/hardeningSeed.json`.

## Despliegue En Otro Host

Opcion recomendada: servidor Linux/VPS con Node.js.

1. Sube el proyecto al servidor.
2. Copia tambien `data/hardening.sqlite` si ya tienes datos.
3. Instala dependencias.
4. Compila.
5. Ejecuta el servidor compilado.

Comandos en el servidor:

```bash
yarn install --frozen-lockfile
yarn build
API_PORT=3001 yarn start
```

La aplicacion quedara disponible en:

```text
http://IP_DEL_SERVIDOR:3001
```

## Mantenerla Encendida

Para produccion, usa un gestor de procesos como PM2:

```bash
yarn global add pm2
yarn build
API_PORT=3001 pm2 start dist-server/server/http/server.js --name credismart-hardening
pm2 save
```

Comandos utiles:

```bash
pm2 status
pm2 logs credismart-hardening
pm2 restart credismart-hardening
pm2 stop credismart-hardening
```

## Publicar Con Nginx

Si quieres usar un dominio, puedes poner Nginx delante del servidor Node.

Ejemplo basico:

```nginx
server {
  server_name tu-dominio.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Luego puedes agregar HTTPS con Certbot si el servidor tiene dominio publico.

## Despliegue Solo Frontend

No es suficiente subir solo `dist` a un hosting estatico si quieres login, usuarios y SQLite. El frontend necesita la API Node para guardar y leer datos.

Solo publica `dist` en un hosting estatico si tambien publicas el backend en otro host y ajustas el cliente para apuntar a esa API.

## Seguridad Operativa

- Cambia las credenciales iniciales del administrador despues del primer inicio.
- Haz backups periodicos de `data/hardening.sqlite`.
- No subas `data/hardening.sqlite` a repositorios publicos.
- Ejecuta la app detras de HTTPS cuando la uses fuera de red local.
- Protege el servidor con firewall permitiendo solo los puertos necesarios.

## Validacion Antes De Publicar

Ejecuta:

```bash
yarn lint
yarn typecheck
yarn build
```

Si esos comandos pasan, el frontend y backend compilan correctamente.
