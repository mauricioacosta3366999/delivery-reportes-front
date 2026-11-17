# Delivery Reportes — Front

SPA para el sistema de delivery: vendedores cargan pedidos, deliverys los toman y los entregan,
y cada uno descarga su reporte mensual en PDF. Consume la API de
[`Delivery-reportes-api`](../Delivery-reportes-api) (casos de uso en `use_cases/`).

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
| Vendedor | `/pedidos`, `/pedidos/nuevo`, `/pedidos/:id`, `/reportes` | Crear, ver, editar y cancelar sus pedidos (mientras estén INICIADOS); reporte mensual |
| Delivery | `/entregas` (Disponibles / Pendientes / Entregados), `/reportes` | Tomar pedidos disponibles y marcarlos como entregados |
| Admin | `/admin/pedidos`, `/admin/zonas`, `/admin/usuarios`, `/reportes` | Ver todos los pedidos, gestionar zonas y usuarios, reportes por vendedor o delivery |

Ciclo del pedido: **Iniciado → Tomado → Entregado** (o **Cancelado** mientras nadie lo tomó).
Las etiquetas visibles están en `src/features/pedidos/types.ts` (`estadoLabels`).

## Estructura

```
src/
  app/            router (rutas lazy por rol), layouts, providers
  components/ui/  kit propio: Button, Field/Input/Select, Card, Dialog, Toast, Tabs, MoneyInput…
  features/
    auth/         sesión (localStorage + logout al vencer el JWT), login, registro, guards
    pedidos/      tipos, API + hooks de Query, formulario, listado, detalle, acciones
    entregas/     vista mobile-first del delivery
    reportes/     descarga del PDF mensual
    admin/        pedidos, zonas y usuarios
  lib/            cliente HTTP (ApiError), formatos (Gs, fechas en America/Asuncion)
  test/           MSW, fixtures y helper para montar la app
```

## Convenciones

- **Importes:** enteros en guaraníes, formateados `es-PY` (`350.000 Gs`). El front muestra
  una vista previa, pero **los importes los calcula siempre el backend**: nunca se envían.
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
   (si no, recargar en `/pedidos` da 404). En nginx:

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
