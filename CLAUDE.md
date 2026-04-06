# CLAUDE.md — PromoCards SV

Contexto e instrucciones para Claude Code en este proyecto.

---

## Qué es este proyecto

PromoCards SV es una web app y app Android que agrega las promociones de 7 bancos salvadoreños en un dashboard unificado. El stack es:

- **Frontend web**: Next.js 15 (App Router) + Tailwind CSS — desplegado en Vercel
- **App mobile**: Expo SDK 54 + Expo Router 6 + React Native 0.81 — APK via EAS Build
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
| Banco Cuscatlán | Angular SPA — DOM post-render | Selector `.square-promotion`; tipo oferta en `p.container-offer`; imagen en `img.img-background-promotion`; waitUntil `networkidle` + 3s extra para Angular |

---

## App Mobile

Ubicada en `apps/mobile/`. Usa Expo SDK 54 + Expo Router 6 + React Native 0.81.

### Desarrollo

```bash
# Crear apps/mobile/.env con EXPO_PUBLIC_API_URL
cd apps/mobile && pnpm dev
# Escanear QR con Expo Go (SDK 54) en Android
```

### Build APK

```bash
cd apps/mobile
eas build --platform android --profile preview
```

### Notas importantes

- Los tipos **no** usan `@promocards/types` como dependencia de workspace — están copiados en `apps/mobile/lib/types.ts` para compatibilidad con EAS Build
- Al modificar `packages/types/src/index.ts`, actualizar también `apps/mobile/lib/types.ts`
- `eas.json` tiene dos perfiles: `preview` (APK para instalar directo) y `production` (AAB para Play Store)
- La variable `EXPO_PUBLIC_API_URL` se define en `eas.json` bajo `env` para los builds remotos

---

## Tipos compartidos

Definidos en `packages/types/src/index.ts`. Al modificar `CategoryId` u otros tipos:

1. Editar `packages/types/src/index.ts`
2. Compilar: `pnpm --filter @promocards/types exec tsc`
3. Actualizar los mapas de iconos/labels en los componentes web
4. **Actualizar también** `apps/mobile/lib/types.ts` (copia manual)

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
- **Colores de banco**: Se usan siempre con inline styles (hex) en los componentes (web y mobile), nunca clases Tailwind de color. Ver `apps/mobile/lib/constants.ts` para los hex oficiales
- **Deduplicación**: Las promos se deducan por `sourceUrl`, no por título
- **API pública**: `/api/promos` y `/api/promos/metrics` son rutas públicas (en `middleware.ts` bajo `PUBLIC_PATHS`). Las rutas `/api/admin/*` requieren sesión

---

## CI/CD

| Workflow | Disparo | Acción |
|---|---|---|
| `ci.yml` | PR → `main` | type-check + lint + build |
| `deploy.yml` | push a `main` | deploy a Vercel producción |
| `scraper.yml` | cron 7am/12pm/6pm SV + manual | corre los 7 scrapers |

Para disparar scrapers manualmente: GitHub → Actions → Scrapers → Run workflow.

---

## Próximos pasos sugeridos

### Funcionalidades
- [x] **Google OAuth** — login con cuenta Google vía Supabase
- [x] **Nombre de usuario** — mostrar nombre completo en headers del admin y dashboard
- [x] **Tracking de scrapers** — registrar quién dispara cada scrape manual (`scraper_triggers`)
- [x] **App Android** — Expo SDK 54, APK generado con EAS Build
- [ ] **Búsqueda de texto libre** en el dashboard (filtrar por texto en título/descripción)
- [ ] **PWA / instalable** — agregar `manifest.json` y service worker para notificaciones push nativas
- [ ] **Página de detalle de promo** — ruta `/promo/[id]` para compartir promos individualmente
- [ ] **Favoritos** — guardar promos marcadas en localStorage o en Supabase por usuario
- [ ] **Filtro por fecha de vencimiento** — slider de días restantes
- [ ] **Notificaciones push mobile** — usar Expo Notifications para alertar nuevas promos

### Scrapers
- [x] **Banco Cuscatlán** — Angular SPA scrapeada con selector `.square-promotion`
- [ ] **Más bancos** — Banco Hipotecario, Scotiabank, Davivienda
- [ ] **Alertas de error por email** — notificar cuando un scraper falla más de 2 veces seguidas
- [ ] **Historial de promos** — en vez de borrar y reinsertar, marcar promos antiguas como `is_active = false`

### Técnico
- [ ] **Tests** — agregar tests unitarios para `detectCategory()`, `parseSpanishDate()`, `extractDiscountValue()`
- [ ] **Rate limiting** en las API routes
- [ ] **Caché** con `revalidate` en los Server Components para reducir queries a Supabase
- [ ] **Publicar en Play Store** — cuenta de desarrollador Google ($25) + perfil `production` en EAS
