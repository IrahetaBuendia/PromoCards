# Revisión funcional — 23 de octubre de 2026

## Causa del fallo actual

La ejecución de [GitHub Actions 39998194177](https://github.com/IrahetaBuendia/PromoCards/actions/runs/39998194177) falla al instalar Chromium:

```text
Playwright does not support chromium on ubuntu26.04-x64
```

`ubuntu-latest` pasó a Ubuntu 26.04. Los seis bancos ejecutados en Linux fallan antes de llegar al scraper y no generan un registro en `scraper_runs`. Se fijó Ubuntu 24.04 en el workflow. Fedecrédito mantiene su runner de Windows; se observó una ejecución completada correctamente en su registro local y otra en curso.

Supabase respondió correctamente. Los datos de los seis bancos de Linux consultados tenían su última actualización el 19 de octubre por la noche, hora de El Salvador. Los endpoints públicos de producción respondieron HTTP 200 y devolvieron 203 promociones de los siete bancos. Esto verifica disponibilidad, pero no frescura.

## Correcciones incluidas en la rama develop

- Los siete scrapers propagan los errores, incluidos fallos al abrir Chromium. La ejecución completa informa qué bancos fallaron y termina con error. Los consumidores en segundo plano capturan ese rechazo.
- Se eliminó el borrado global previo. El guardado hace upsert por banco y URL, y retira únicamente registros obsoletos después de una escritura exitosa. Conserva IDs, fecha de creación y desactivaciones manuales. Una extracción vacía se trata como fallo para conservar datos anteriores.
- Nuevo `--dry-run`: ejecuta la extracción sin acceder a la base de datos, incluidos los registros de ejecución.
- Se corrigieron las URLs de imagen del fallback de Credicomer y la asociación entre tarjetas y descripciones del fallback de Credisiman.
- La API web excluye promociones vencidas. Las métricas comparan porcentajes numéricamente y propagan errores de consulta.
- Se conectó el botón Editar de moderación; ahora permite borrar una descripción.
- Las fechas extraídas usan la última fecha completa del texto, validan días imposibles y vencen al terminar el día de El Salvador.
- Los tests de CI ahora son bloqueantes.

## Validación

Extracción real sin escrituras, completada para todos los bancos:

| Banco | Promociones únicas |
|---|---:|
| Fedecrédito | 23 |
| Industrial | 10 |
| Credicomer | 17 |
| BAC | 11 |
| Credisiman | 14 |
| Agrícola | 92 |
| Cuscatlán | 40 |
| Total | 207 |

Agrícola produjo 93 tarjetas; una compartía la misma URL fuente y se deduplicó. La prueba de extracción antecedió al ajuste de fechas; ese ajuste se verificó con pruebas automatizadas.

Pruebas nuevas: fallo de lectura/escritura sin borrados, orden del guardado, deduplicación por banco, conservación de identidad y desactivaciones, extracción vacía, modo diagnóstico, métricas, filtros públicos, propagación de errores y fechas. El monitor existente también se probó sin enviar correos.

Resultados: 8 pruebas nuevas y 10 del monitor aprobadas; `pnpm type-check` del monorepo y build de producción de la web aprobados.

## Pendientes y límites

- Integrar los cambios de `develop` a `main` y comprobar una ejecución de Actions con Ubuntu 24.04. El workflow solo corre sus jobs en `main`; subir a `develop` no confirma la recuperación de producción. Durante la revisión no se hizo deploy ni se dispararon scrapers con escritura.
- `pnpm lint` falla por falta de configuración de ESLint 9 en API y mobile. Es un problema previo y sigue pendiente.
- El scheduler Express local usa cada cuatro horas; Actions usa tres horarios diarios. No deben operarse como schedulers simultáneos sin coordinación.
- La extracción sin escrituras comprueba acceso y selectores actuales; no garantiza que cada promoción tenga condiciones, categoría o fechas completas. No se probó la escritura contra producción.
- La conservación de moderación en el scraper cubre `is_active`; títulos, descripciones y categorías vuelven a recibir los valores de la fuente en cada actualización.
- El parser de fechas sigue siendo heurístico: no interpreta todos los formatos ni distingue semánticamente fechas de compra, viaje y canje.
- No se hizo una prueba visual completa de Android ni de los flujos autenticados del administrador.
