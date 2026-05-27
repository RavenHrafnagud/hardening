CrediSmart Hardening — Hoja de Presentación

Objetivo
- Explicar en 1 página qué hace la aplicación, su arquitectura y cómo demostrarla en vivo.

Resumen funcional
- Registro y gestión de equipos con hardening.
- Almacenamiento de llaves BitLocker y asignación de usuarios a equipos.
- Roles: `admin` y `standard` (admin gestiona equipos y cuentas; standard puede editar asignaciones).

Arquitectura (alto nivel)
- Frontend: React + Vite (SPA) en `src/app`.
- Backend: Node.js (servidor HTTP propio) en `server/http`.
- Persistencia: SQLite en `data/hardening.sqlite` gestionada por `server/hardening-sqlite/HardeningSqliteDatabase.ts`.
- Separación en capas: `presentation` (UI), `domain` (tipos/logic), `infrastructure` (API client / DB).

Flujo de demostración (5 min)
1. Abrir la app en dev o build: `yarn dev` o `yarn start`.
2. Login con cuenta demo (admin) y mostrar panel de administración.
3. Editar un equipo: pulsar "Editar" → cambiar nombre/serial → guardar → mostrar que el cambio se refleja.
4. Cambiar a usuario `standard`, demostrar edición de asignación y restricciones.
5. Mostrar `data/hardening.sqlite` y explicar la semilla automática al iniciar.

Endpoints clave (para la demo)
- `POST /api/auth/login` — obtener token.
- `GET /api/hardening` — snapshot (equipos + asignaciones + métricas).
- `PATCH /api/equipments/:id` — editar equipo (admin).
- `PATCH /api/assignments/:id` — editar usuario asignado (admin/standard según reglas).

Puntos para exponer (3 minutos)
- División de responsabilidades: por qué separar `auth`, `requestParser`, `response` y `staticFile`.
- Robustez: límites de tamaño del body, manejo de sesiones y limpieza de expirados.
- Mejoras hechas: validaciones en PATCH, índices en sesiones, optimización de `getDatabase()`.

Posibles preguntas y respuestas rápidas
- Q: ¿Cómo se inicializa la DB? A: `HardeningSqliteDatabase` ejecuta `createSchema()` y `seedIfNeeded()` al arrancar.
- Q: ¿Qué pasa si el body es muy grande? A: `requestParser` devuelve `413 Request Entity Too Large`.
- Q: ¿Cómo agregar control de propiedad (solo editar asignaciones propias)? A: Añadir check en `withAccount` o en el handler `PATCH /api/assignments/:id` comparando `account.id` con el propietario de la asignación.

Contacto técnico
- Archivo principal del servidor: `server/http/server.ts`
- Lógica DB: `server/hardening-sqlite/HardeningSqliteDatabase.ts`
- UI principal: `src/hardening/presentation/DashboardScreen.tsx`

Fin de la hoja de presentación.
