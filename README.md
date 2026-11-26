# Delivery Reportes — Front

SPA para el sistema de delivery: vendedores cargan pedidos, deliverys los toman y los entregan,
y cada uno descarga su reporte mensual en PDF o Excel. Consume la API de
[`Delivery-reportes-api`](../Delivery-reportes-api) (casos de uso CU-01 a CU-17 en `use_cases/`).

> **Compatibilidad:** este front usa los campos y filtros de las etapas 1 a 5 de la API
> (número de pedido, asignación, catálogo, Excel…). La API es estricta, así que **siempre se
> deploya primero la API (con `npm run migrate`) y después el front**.

**Stack:** React 19 · Vite 8 · TypeScript · Tailwind CSS v4 · React Router · TanStack Query ·
React Hook Form + Zod · Vitest + Testing Library + MSW.

## Requisitos

- Node.js 22+
- El backend corriendo (por defecto en `http://localhost:3000`)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # opcional: solo si la API no está en el proxy por defecto
npm run dev                  # http://localhost:5173
```

En desarrollo, Vite hace proxy de `/api` al destino de `API_PROXY_TARGET` (por defecto
`http://localhost:3000`), así que no hace falta configurar CORS. Dos opciones:

**Contra la API deployada** (rápido, sin backend local). En `.env.local`:

```bash
API_PROXY_TARGET=https://delivery-reportes-api.onrender.com
```

Ojo: son datos reales de ese entorno. El plan gratuito de Render "duerme" el servicio, así
que la primera request puede tardar ~1 minuto.

**Contra la API local** (en `../Delivery-reportes-api`):

```bash
docker run --name delivery-mongo -p 127.0.0.1:27017:27017 -d mongo:8
npm ci
cp .env.example .env      # completar JWT_SECRET y BOOTSTRAP_*; PORT si el 3000 está ocupado
npm run bootstrap:admin   # crea el primer ADMIN
npm run dev
```

Si la API corre en otro puerto, apuntar `API_PROXY_TARGET` ahí (p. ej. `http://localhost:3001`).

Con el admin creado: iniciá sesión, cargá al menos una **zona** y después registrá
vendedores y deliverys desde `/registro`.

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | URL base que usa el navegador. En producción: `https://delivery-reportes-api.onrender.com/api/v1`, y el origen del front debe estar en `CORS_ORIGINS` del backend. |
| `API_PROXY_TARGET` | `http://localhost:3000` | Solo desarrollo: a dónde reenvía el proxy de Vite las llamadas a `/api`. |

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint |
| `npm test` | Tests (Vitest + MSW, sin backend real) |
| `npm run test:watch` | Tests en modo watch |

## Roles y pantallas

| Rol | Rutas | Puede |
|---|---|---|
| Vendedor | `/pedidos`, `/pedidos/nuevo`, `/pedidos/:id`, `/productos`, `/reportes` | Crear, ver, editar y cancelar sus pedidos (mientras estén INICIADOS, aunque estén asignados); marcar "el cliente ya me pagó"; catálogo con precio y costo; reporte mensual |
| Delivery | `/entregas` (Disponibles / Pendientes / Entregados), `/reportes` | Ver primero los pedidos asignados a él, tomar disponibles, marcarlos como entregados (y corregir quién cobró), subir la foto de la boleta de la transportadora |
| Admin | `/admin/pedidos`, `/admin/deliverys`, `/admin/zonas`, `/admin/productos`, `/admin/usuarios`, `/reportes` | Todos los pedidos (crear a nombre de un vendedor, asignar o liberar el delivery), carga por delivery y zona, zonas con delivery por defecto, catálogos, usuarios y reportes |

Ciclo del pedido: **Iniciado** (recibe su número `#N`) → *Asignado* (opcional: por el admin o
por la zona; sigue siendo INICIADO) → **Tomado** → **Entregado** (o **Cancelado** mientras nadie
lo tomó). El admin puede reasignar o liberar un pedido tomado. Las etiquetas visibles están en
`src/features/pedidos/types.ts` (`estadoLabels`); "Asignado" lo arma `EstadoBadge`.

## Marca

El logo de Ato Logística está en `public/`, con fondo transparente:

- `logo-ato-256.webp` (encabezado) y `logo-ato-512.webp` (login y registro);
- `logo-ato.png` (512 × 512), el mismo logo en PNG para usar fuera del front, por ejemplo en el PDF o el Excel del backend;
- `favicon.svg`, un ícono vectorial simplificado (pin con "A") que se lee a 16 px;
- `apple-touch-icon.png` (180 × 180, fondo blanco).

## Estructura

```
src/
  app/            router (rutas lazy por rol), layouts, providers
  components/ui/  kit propio: Button, Field/Input/Select, Card, Dialog, Toast, Tabs, MoneyInput…
  features/
    auth/         sesión (localStorage + logout al vencer el JWT), login, registro, guards
    pedidos/      tipos, API + hooks de Query, formulario, listado, detalle, acciones, asignación
    productos/    catálogo del vendedor (y buscador del formulario de pedido)
    entregas/     vista mobile-first del delivery
    reportes/     descarga del reporte mensual (PDF o Excel)
    admin/        pedidos, deliverys, zonas y usuarios
  lib/            cliente HTTP (ApiError), formatos (Gs, fechas en America/Asuncion)
  test/           MSW, fixtures y helper para montar la app
```

## Convenciones

- **Importes:** enteros en guaraníes, formateados `es-PY` (`350.000 Gs`). El front muestra
  una vista previa (`calcularMontos`, con pago directo y ganancia), pero **los importes los
  calcula siempre el backend**: nunca se envían.
- **Pago directo al vendedor:** el delivery no cobra (`montoTotal = 0`) y a rendir = −delivery.
- **Costos:** el delivery nunca los recibe; el vendedor y el admin ven costo y ganancia.
- **Boleta de depósito (CU-17):** la foto se comprime a JPEG en el navegador y se sube directo a
  Cloudflare R2 con una URL firmada (`features/pedidos/boleta.ts`); la API solo firma y confirma.
  El bucket tiene que tener en su CORS el origen del front (`http://localhost:5173` en dev).
- **Teléfonos:** cada contacto ofrece llamar y WhatsApp (`lib/telefono.ts`: `0981…` → `wa.me/595981…`).
- **Contratos estrictos:** la API rechaza campos desconocidos, así que los opcionales vacíos
  se omiten (ver `toCreatePayload` / `toUpdatePayload` en `features/pedidos/form.ts`).
- **Errores:** `ApiError { status, message, detalles }`. Los `detalles` de un 400 se mapean a
  los campos del formulario (`applyApiErrors`).
- **Sesión:** el JWT dura lo que configure el backend (1 h por defecto) y no hay refresh: al
  vencer, o ante cualquier 401, se vuelve al login con un aviso.
- **Fechas:** se muestran y filtran en hora de Paraguay; los filtros `desde`/`hasta` se envían
  como ISO con offset en un intervalo `[desde, hasta)`.
- **Rate limit:** la API permite 300 requests cada 15 min por IP, así que la lista de pedidos
  disponibles del delivery se refresca cada 30 s y solo con la pestaña visible.

## Deploy

Es una SPA estática: el build genera `dist/` y no necesita un servidor Node en ejecución.

```bash
nvm use        # Node 22 (ver .nvmrc)
npm ci
npm run build  # usa .env.production → API en Render
```

Checklist del hosting:

1. **Publicar `dist/`** por HTTPS.
2. **Fallback de SPA:** cualquier ruta que no sea un archivo debe devolver `index.html`
   (si no, recargar en `/pedidos` da 404). En **Netlify** ya está resuelto con
   `public/_redirects` (y el caché de assets con `public/_headers`), que el build copia a
   `dist/`. En nginx:

   ```nginx
   location / {
     try_files $uri /index.html;
   }
   ```

3. **Caché:** `assets/*` puede cachearse por un año (los nombres cambian en cada build);
   `index.html` sin caché (`Cache-Control: no-cache`), para que cada deploy se vea al instante.
4. **CORS en el backend:** agregar el dominio del front (p. ej. `https://tudominio.com`) a
   `CORS_ORIGINS` del servicio en Render. Sin eso el navegador bloquea todas las llamadas,
   incluido el login.
5. **Datos iniciales:** un usuario ADMIN en la base de producción (`npm run bootstrap:admin`
   en el backend) y al menos una zona activa, cargada desde **Zonas**.

Para apuntar a otra API, cambiar `VITE_API_URL` en `.env.production` (o pasarla como variable
de entorno al build) y volver a buildear: el valor queda fijo dentro del bundle.
