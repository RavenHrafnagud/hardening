# CrediSmart Hardening

Aplicacion web para registrar equipos con hardening, conservar las llaves de BitLocker y asignar usuarios a equipos ya inscritos.

## Tecnologias

- Yarn
- Vite
- React
- TypeScript
- ESLint

## Accesos locales

- Administrador: `admin` / `admin123`
- Usuario: `standard` / `standard123`

El rol administrador puede crear equipos y ver/exportar la base en JSON. El rol usuario solo puede asignar usuarios a equipos existentes que no tengan usuario.

## Datos

La semilla inicial se genero desde `LLaves de Cifrado Bitlocker - Hoja 1.csv.xls` y quedo en `src/hardening/seed/hardeningSeed.json`.

Al iniciar el servidor se crea una base SQL local en `data/hardening.sqlite`. Ese archivo contiene equipos, usuarios asignados, cuentas y sesiones. Para mover la aplicacion a otro host, copia el proyecto y conserva la carpeta `data`.

## Screaming Architecture

- `src/app`: arranque React, sesion de navegador y estilos globales.
- `src/hardening`: inventario, llaves BitLocker, asignaciones y dashboard.
- `src/identity-access`: roles, cuenta autenticada y login.
- `server/hardening-sqlite`: persistencia SQL local del dominio hardening.
- `server/http`: API HTTP, autenticacion de requests y servidor estatico.

## Comandos

```bash
yarn dev
yarn lint
yarn typecheck
yarn build
yarn start
```

`yarn dev` levanta la API SQLite en `http://localhost:3001` y Vite en `http://localhost:5173`. `yarn build && yarn start` sirve la aplicacion compilada y la API desde `http://localhost:3001`.

Si el puerto `3001` esta ocupado, cierra el proceso anterior o usa otro puerto para la API:

```bash
API_PORT=3002 yarn dev
```
