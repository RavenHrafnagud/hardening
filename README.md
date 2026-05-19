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

La semilla inicial se genero desde `LLaves de Cifrado Bitlocker - Hoja 1.csv.xls` y quedo en `src/infrastructure/seed/hardeningSeed.json`. En ejecucion, los cambios se guardan en `localStorage` bajo una base local del navegador.

## Arquitectura

- `src/domain`: tipos del dominio.
- `src/application`: autenticacion y casos de uso de equipos/asignaciones.
- `src/infrastructure`: repositorio local y semilla importada.
- `src/presentation`: pantallas y componentes responsive.

## Comandos

```bash
yarn dev
yarn lint
yarn typecheck
yarn build
```
