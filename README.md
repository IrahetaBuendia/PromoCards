# PromoCards SV — v2.0

Web app privada que consolida las promociones de 6 tarjetas de crédito salvadoreñas en un solo dashboard. Scrapers headless (Playwright) corren automáticamente 3 veces al día, clasifican las promos por categoría y las almacenan en Supabase.

---

## Bancos cubiertos

| Banco | URL fuente |
|---|---|
| Fedecrédito | fedecredito.com.sv/promociones/todas |
| Banco Industrial | corporacionbi.com/sv/bancoindustrialsv/promociones |
| Credicomer | credicomer.com.sv/personas/promociones |
| BAC Credomatic | baccredomatic.com/es-sv/personas/promociones |
| Credisiman | credisiman.com/promotion/SV |
| Banco Agrícola | bancoagricola.com/promociones |

---

## Arquitectura

```
promocards-sv/                  ← monorepo (pnpm workspaces + Turborepo)
├── apps/
│   ├── api/                    ← Scrapers Playwright (GitHub Actions)
│   └── web/                    ← Next.js 15 + Tailwind (Vercel)
└── packages/
    └── types/                  ← Tipos TypeScript compartidos
```

```
┌──────────────────────────────────────────────────────┐
│  GitHub Actions                                      │
│  Cron 7am / 12pm / 6pm SV  →  apps/api/src/scrape.ts │
│  ubuntu-latest + Playwright + Chromium               │
│  Escribe directo a Supabase                          │
└───────────────────┬──────────────────────────────────┘
                    │ escribe
                    ▼
┌───────────────┐       ┌─────────────────────────────┐
│   Supabase    │       │   Vercel (Next.js)           │
│   PostgreSQL  │◄──────│   Route Handlers = API       │
│   Auth        │       │   Dashboard + Panel Admin    │
└───────────────┘       └─────────────────────────────┘
```

- **Frontend + API**: Next.js 15 (App Router + Route Handlers) — Vercel
- **Scrapers**: GitHub Actions (cron + workflow_dispatch)
- **Base de datos + Auth**: Supabase (gratuito)

**100% sin costo** — Vercel hobby + Supabase free + GitHub Actions gratis.

---

## Requisitos previos

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Una cuenta y proyecto en [Supabase](https://supabase.com)

---

## Variables de entorno

### `apps/web/.env.local` (frontend + API routes)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# URL base de la app (para redirect de OAuth)
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # producción: https://tu-dominio.vercel.app

# Scrape manual desde el panel admin (opcional)
GITHUB_PAT=ghp_xxxxxxxxxxxx
GITHUB_OWNER=tu-usuario
GITHUB_REPO=promocards-sv
```

### `.env` raíz (solo para scrapers en local)

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## Configuración de la base de datos

Ejecuta en el **SQL Editor** de Supabase:

```sql
-- Tabla de promociones
create table if not exists promos (
  id            uuid primary key default gen_random_uuid(),
  bank_id       text not null,
  title         text not null,
  description   text,
  category_id   text not null,
  discount_type text,
  discount_value text,
  expires_at    timestamptz,
  image_url     text,
  source_url    text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (bank_id, source_url)
);

-- Tabla de historial de scrapers
create table if not exists scraper_runs (
  id            uuid primary key default gen_random_uuid(),
  bank_id       text not null,
  status        text not null,
  promos_found  integer not null default 0,
  error_type    text,
  error_message text,
  started_at    timestamptz not null,
  finished_at   timestamptz
);

-- Tabla de triggers manuales de scrapers (quién los disparó)
create table if not exists scraper_triggers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  user_email   text not null,
  user_name    text,
  bank_id      text,
  triggered_at timestamptz default now()
);
```

---

## Instalación y ejecución local

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd promocards-sv
pnpm install
```

### 2. Instalar Chromium para Playwright (primera vez)

```bash
pnpm --filter @promocards/api exec playwright install chromium
```

### 3. Levantar el frontend

```bash
pnpm --filter @promocards/web dev
# → http://localhost:3000
```

### 4. Correr scrapers manualmente en local

```bash
# Todos los bancos
pnpm --filter @promocards/api exec tsx src/scrape.ts

# Un banco específico
pnpm --filter @promocards/api exec tsx src/scrape.ts bac-credomatic
```

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm --filter @promocards/web dev` | Levanta el frontend con hot-reload |
| `pnpm build` | Compila todos los paquetes |
| `pnpm lint` | ESLint en todos los paquetes |
| `pnpm type-check` | Verifica tipos TypeScript |

---

## API Routes (Next.js Route Handlers)

### Públicos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/promos` | Promos activas ordenadas por categoría |
| `GET` | `/api/promos?category=gasolina` | Filtrar por categoría |
| `GET` | `/api/promos?bank=bac-credomatic` | Filtrar por banco |
| `GET` | `/api/promos/metrics` | Métricas del dashboard |

### Admin (requieren sesión activa)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/admin/scraper-runs` | Historial de ejecuciones |
| `GET` | `/api/admin/promos` | Todas las promos (activas e inactivas) |
| `PATCH` | `/api/admin/promos/:id` | Moderar promo |
| `POST` | `/api/admin/scrape` | Disparar scrape vía GitHub Actions |

---

## Deploy en producción

### Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar el SQL de la sección anterior
3. Habilitar Email Auth en **Authentication → Providers → Email**
4. Crear el primer usuario en **Authentication → Users → Add user**
5. *(Opcional)* Habilitar Google OAuth en **Authentication → Providers → Google** con Client ID y Client Secret de Google Cloud Console
6. *(Si usas Google OAuth)* En **Authentication → URL Configuration**:
   - **Site URL**: `https://tu-dominio.vercel.app`
   - **Redirect URLs**: agregar `https://tu-dominio.vercel.app/auth/callback`

### Vercel (frontend + API)

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar **Root Directory** → `apps/web`
3. Agregar variables de entorno en **Settings → Environment Variables**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL    ← URL de producción (para redirect de Google OAuth)
GITHUB_PAT              ← para scrape manual desde el panel admin
GITHUB_OWNER
GITHUB_REPO
```

### GitHub Actions (scrapers)

Agregar secrets en **Settings → Secrets and variables → Actions**:

| Secret | Cómo obtenerlo |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` tras correr `vercel link` |
| `VERCEL_PROJECT_ID_WEB` | `.vercel/project.json` tras correr `vercel link` en `apps/web` |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |

---

## CI/CD (GitHub Actions)

El repositorio tiene tres workflows:

### `ci.yml` — Integración continua

- **Disparo**: en cada Pull Request hacia `main`
- **Qué hace**: build de tipos compartidos → type-check → lint
- **Efecto**: bloquea el merge si algún paso falla

### `deploy.yml` — Deploy automático

- **Disparo**: en cada push/merge a `main`
- **Qué hace**: build de tipos → deploy a Vercel en producción (`--prod`)
- **Efecto**: la app en Vercel se actualiza automáticamente

### `scraper.yml` — Scrapers programados

- **Disparo automático**: cron `0 0,13,18 * * *` (UTC) = **7am, 12pm y 6pm hora El Salvador (UTC-6)**
- **Disparo manual**: desde GitHub UI (Actions → Scrapers → Run workflow) o desde el panel admin de la app
- **Input opcional**: `bank_id` para scrapear solo un banco (dejar vacío = todos)
- **Qué hace**: instala Playwright + Chromium → corre `scrape.ts` → guarda en Supabase

#### Flujo completo de un cambio

```
feature/nueva-funcionalidad
        │
        │ Pull Request → ci.yml corre (lint + type-check + build)
        │
        ▼
      main  ──► deploy.yml corre ──► Vercel actualiza producción
                       +
              scraper.yml corre 3x/día ──► Supabase se actualiza
```

---

## Categorías

Las promos se clasifican automáticamente por palabras clave en `apps/api/src/scrapers/types.ts`. Orden fijo:

| # | Icono | Categoría |
|---|---|---|
| 1 | ⛽ | Gasolina |
| 2 | 🛒 | Supermercados |
| 3 | 💊 | Farmacias |
| 4 | 🍽️ | Restaurantes |
| 5 | 🏬 | Almacenes |
| 6 | 🔧 | Repuestos y Talleres |
| 7 | 🔨 | Ferreterías |
| 8 | 🎬 | Streaming |
| 9 | 📦 | Otros |

---

## Estructura del monorepo

```
apps/
  api/
    src/
      scrapers/       ← Un archivo por banco + clasificador por keywords
        types.ts      ← detectCategory(), detectDiscountType(), parseSpanishDate()
        banco-agricola.ts
        banco-industrial.ts
        bac-credomatic.ts
        credicomer.ts
        credisiman.ts
        fedecredito.ts
      lib/
        db.ts         ← savePromos(), logScraperRun()
      scrape.ts       ← Entry point para GitHub Actions
  web/
    src/
      app/
        page.tsx            ← Dashboard principal
        login/              ← Login con Supabase Auth
        admin/              ← Panel de administración
        api/                ← Route Handlers (promos + admin)
      components/
        dashboard/          ← MetricsBar, PromoGrid, PromoCard, PromoModal, filtros
        admin/              ← ScraperStatusPanel, PromoModerationTable
      lib/
        queries.ts          ← Funciones Supabase (server components)
        supabase/           ← Clientes browser, server, service, auth-guard
packages/
  types/
    src/index.ts      ← BankId, CategoryId, Promo, ScraperRun, etc.
```

---

## Rama de desarrollo

Los cambios nuevos se desarrollan en la rama `develop` y se integran a `main` mediante Pull Request. La rama `main` representa siempre la versión estable en producción (actualmente `2.0v`).

```bash
# Trabajar en un nuevo cambio
git checkout develop
git pull origin develop

# ... hacer cambios ...

git push origin develop
# → abrir PR develop → main en GitHub
```
