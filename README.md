# PromoCards SV

Web app privada que consolida las promociones de 6 tarjetas de crédito salvadoreñas en un solo dashboard. Cada 4 horas, scrapers headless (Playwright) recorren los sitios de los bancos, clasifican las promos por categoría y las almacenan en Supabase.

## Bancos cubiertos

| Banco | URL fuente |
|---|---|
| Fedecrédito | fedecredito.com.sv/promociones/todas |
| Banco Industrial | corporacionbi.com/sv/bancoindustrialsv/promociones |
| Credicomer | credicomer.com.sv/personas/promociones?type=emma |
| BAC Credomatic | baccredomatic.com/es-sv/personas/promociones |
| Credisiman | credisiman.com/promotion/SV |
| Banco Agrícola | bancoagricola.com/promociones |

---

## Arquitectura

```
promocards-sv/                  ← monorepo (pnpm workspaces + Turborepo)
├── apps/
│   ├── api/                    ← Scrapers Playwright (solo local + GitHub Actions)
│   └── web/                    ← Next.js 15 + Tailwind (Vercel)
└── packages/
    └── types/                  ← Tipos TypeScript compartidos
```

```
┌──────────────────────────────────────────────────────┐
│  GitHub Actions — gratis                             │
│  Cron cada 4 h  →  apps/api/src/scrape.ts            │
│  ubuntu-latest tiene Playwright + Chromium           │
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
- **Scrapers + Scheduler**: GitHub Actions (cron + workflow_dispatch)
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
# Supabase — claves en Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, nunca al browser

# Scrape manual desde el panel admin (opcional)
# PAT de GitHub con scope "workflow"
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

El frontend usa Route Handlers propios para la API. No necesita el servidor Express.

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

### Vercel (frontend + API)

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar **Root Directory** → `apps/web`
3. Agregar variables de entorno en **Settings → Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GITHUB_PAT          ← opcional, para scrape manual desde el panel admin
GITHUB_OWNER
GITHUB_REPO
```

### GitHub Actions (scrapers)

Agregar secrets en **Settings → Secrets and variables → Actions**:

| Secret | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |

Los scrapers corren automáticamente cada 4 horas. También se pueden disparar manualmente desde **Actions → Scrapers → Run workflow** en GitHub, o desde el panel admin de la app.

---

## CI/CD (GitHub Actions)

| Workflow | Disparo | Qué hace |
|---|---|---|
| `ci.yml` | En cada PR a `main` | Type-check + lint + build. Bloquea merge si falla |
| `deploy.yml` | En merge a `main` | Deploy automático a Vercel |
| `scraper.yml` | Cron cada 4 h + manual | Corre los 6 scrapers y guarda en Supabase |

### Secrets para CI/CD

| Secret | Cómo obtenerlo |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_PROJECT_ID_WEB` | `.vercel/project.json` tras correr `vercel link` en `apps/web` |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |

---

## Categorías

Las promos se clasifican automáticamente por palabras clave. Orden fijo:

1. ⛽ Gasolina
2. 🛒 Supermercados
3. 💊 Farmacias
4. 🍽️ Restaurantes
5. 🎬 Streaming
6. 📦 Otros

---

## Estructura del monorepo

```
apps/
  api/
    src/
      scrapers/       ← Un archivo por banco + clasificador por keywords
      lib/db.ts       ← savePromos(), logScraperRun()
      scrape.ts       ← Entry point para GitHub Actions (acepta bankId opcional)
  web/
    src/
      app/
        page.tsx            ← Dashboard principal
        login/              ← Login con Supabase Auth
        admin/              ← Panel de administración
        api/                ← Route Handlers (promos + admin)
      components/
        dashboard/          ← MetricsBar, PromoGrid, PromoCard, filtros...
        admin/              ← ScraperStatusPanel, PromoModerationTable, modals
      lib/
        queries.ts          ← Funciones Supabase (server components + route handlers)
        api.ts              ← Helpers para Server Components
        admin-api.ts        ← Helpers fetch para Client Components
        supabase/           ← Clientes browser, server, service, auth-guard
packages/
  types/
    src/index.ts      ← BankId, CategoryId, Promo, ScraperRun, etc.
```
