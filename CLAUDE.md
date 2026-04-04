# CLAUDE.md — PromoCards SV

Contexto e instrucciones para Claude Code en este proyecto.

---

## Qué es este proyecto

PromoCards SV es una web app privada que agrega las promociones de 6 bancos salvadoreños en un dashboard unificado. El stack es:

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS — desplegado en Vercel
- **Scrapers**: Playwright headless — corren en GitHub Actions 3x/día
- **Base de datos**: Supabase (PostgreSQL + Auth)
- **Monorepo**: pnpm workspaces + Turborepo

---

## Branching

- `main` = versión estable en producción (etiquetada `2.0v`)
- `develop` = rama de desarrollo para nuevos cambios
- Los cambios en `develop` se integran a `main` vía Pull Request
- El CI (`ci.yml`) corre automáticamente en cada PR hacia `main`

**Todos los cambios nuevos van en `develop`, no directamente en `main`.**

---

## Arquitectura de scrapers

Cada banco tiene su propio archivo en `apps/api/src/scrapers/`. Cada scraper:

1. Lanza Chromium con Playwright
2. Navega al sitio del banco
3. Extrae título, descripción, imagen, fecha de vencimiento y URL fuente
4. Llama a `savePromos()` en `lib/db.ts` que borra las promos anteriores del banco e inserta las nuevas

### Particularidades por banco

| Banco | Técnica de imagen | Notas |
|---|---|---|
| Banco Agrícola | CSS `background-image` en `.promos-mes-item-imagen` | Parsear con regex `url(...)` |
| Credisiman | API `ingress-prd.credisiman.com/cards/promotions/paged` | JSON en `response.content`; imagen en campo `image` (token); URL = `/users/media/files?q={token}` |
| Credicomer | API `credicomer.com.sv/api/promotions/find-active` | JSON en `response`; deduplicar por `sourceUrl` porque hay promos con mismo título |
| BAC Credomatic | Paginado `?page=N` | Detectar fin con `.pager__link--next` ausente; MAX_PAGES=20 |
| Fedecrédito | DOM directo | Navega a cada promo individual para descripción completa |
| Banco Industrial | DOM + lazy-load | Scroll antes de extraer; imágenes en `data-lazy-src` |

---

## Tipos compartidos

Definidos en `packages/types/src/index.ts`. Al modificar `CategoryId` u otros tipos:

1. Editar `packages/types/src/index.ts`
2. Compilar: `pnpm --filter @promocards/types exec tsc`
3. Actualizar todos los mapas de iconos/labels en los componentes web que los usan

### Categorías actuales (en orden)

```
gasolina → supermercados → farmacias → restaurantes →
almacenes → repuestos-talleres → ferreterias → streaming → otros
```

---

## Autenticación

Implementada con Supabase Auth + `@supabase/ssr`. Soporta dos métodos:

- **Email/contraseña**: `supabase.auth.signInWithPassword()` via Server Action en `apps/web/src/app/actions/auth.ts`
- **Google OAuth**: `supabase.auth.signInWithOAuth({ provider: 'google' })` — requiere configuración en Supabase Dashboard → Authentication → Providers → Google

### Variables necesarias para OAuth

```env
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app   # (http://localhost:3000 en dev)
```

### Configuración en Supabase

- **Authentication → Providers → Google**: habilitar con Client ID y Client Secret de Google Cloud Console
- **Authentication → URL Configuration → Redirect URLs**: agregar `https://tu-dominio.vercel.app/auth/callback`
- **Authentication → URL Configuration → Site URL**: poner la URL de producción

El nombre del usuario autenticado se obtiene de `user.user_metadata.full_name` (Google) o `user.user_metadata.name`, con fallback a `user.email`.

---

## Convenciones

- **snake_case → camelCase**: Supabase devuelve `bank_id`, `category_id`, etc. El mapeo a tipos TypeScript (`bankId`, `categoryId`) se hace explícitamente en `apps/web/src/lib/queries.ts`
- **Colores de banco**: Se usan siempre con inline styles (hex) en los componentes, nunca clases Tailwind de color (para consistencia con los colores oficiales)
- **Deduplicación**: Las promos se deducan por `sourceUrl`, no por título

---

## CI/CD

| Workflow | Disparo | Acción |
|---|---|---|
| `ci.yml` | PR → `main` | type-check + lint + build |
| `deploy.yml` | push a `main` | deploy a Vercel producción |
| `scraper.yml` | cron 7am/12pm/6pm SV + manual | corre los 6 scrapers |

Para disparar scrapers manualmente: GitHub → Actions → Scrapers → Run workflow.

---

## Próximos pasos sugeridos

### Funcionalidades
- [x] **Google OAuth** — login con cuenta Google vía Supabase
- [x] **Nombre de usuario** — mostrar nombre completo en headers del admin y dashboard
- [x] **Tracking de scrapers** — registrar quién dispara cada scrape manual (`scraper_triggers`)
- [ ] **Búsqueda de texto libre** en el dashboard (filtrar por texto en título/descripción)
- [ ] **PWA / instalable** — agregar `manifest.json` y service worker para notificaciones push nativas
- [ ] **Página de detalle de promo** — ruta `/promo/[id]` para compartir promos individualmente
- [ ] **Favoritos** — guardar promos marcadas en localStorage o en Supabase por usuario
- [ ] **Filtro por fecha de vencimiento** — slider de días restantes

### Scrapers
- [ ] **Más bancos** — Banco Hipotecario, Scotiabank, Davivienda
- [ ] **Alertas de error por email** — notificar cuando un scraper falla más de 2 veces seguidas
- [ ] **Historial de promos** — en vez de borrar y reinsertar, marcar promos antiguas como `is_active = false`

### Técnico
- [ ] **Tests** — agregar tests unitarios para `detectCategory()`, `parseSpanishDate()`, `extractDiscountValue()`
- [ ] **Rate limiting** en las API routes
- [ ] **Caché** con `revalidate` en los Server Components para reducir queries a Supabase
