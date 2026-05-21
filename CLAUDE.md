# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Dev server (browser)
npm run build          # Production build
npm test               # Karma/Jasmine unit tests
ng test --include='**/foo.service.spec.ts'  # Run a single spec file
npm run lint           # ESLint (angular-eslint)
npm run cap:sync       # Build + cap sync (after changing web code)
npm run cap:android    # Build + sync + open Android Studio
npm run cap:ios        # Build + sync + open Xcode
npm run cap:run:android  # Build + sync + deploy to connected device/emulator
```

## Architecture

**Single-app, tab-based** (Ionic tabs). All routes are lazy-loaded under `tabs/`:

| Route | Page | Purpose |
|---|---|---|
| `tabs/home` | `HomePage` | Live GPS → grid + map |
| `tabs/grid-lookup` | `GridLookupPage` | Resolve grid or Plus Code → map |
| `tabs/qso-log` | `QsoLogPage` | Browse, export, clear QSO log |
| `tabs/settings` | `SettingsPage` | Callsign, grid precision, theme, distance unit |

### Service layer (all `providedIn: 'root'`)

| Service | Responsibility |
|---|---|
| `GeolocationService` | Wraps `@capacitor/geolocation`. Exposes `position`, `status`, `error` signals. Guards against duplicate watches. |
| `MaidenheadService` | `lat/lon ↔ grid` via `@mr_uu/maidenhead-grid`. Validates, truncates, computes bounds/center. |
| `PluscodeService` | `lat/lon ↔ Plus Code` via `open-location-code`. Encode/decode/validate. |
| `BearingService` | Haversine distance (km + NM) and initial bearing between two `LatLon` points. |
| `SettingsService` | Persists `AppSettings` to `@capacitor/preferences`. Exposes typed `computed()` signals (`callsign`, `gridPrecision`, `themeMode`, `distanceUnit`). |
| `QsoLogService` | CRUD + ADIF v3 export + `@capacitor/share`. Persists to `@capacitor/preferences`. |
| `ThemeService` | Applies `data-theme="dark|light"` to `<html>` or removes it for `auto`. Uses `effect()` to react to `SettingsService.themeMode`. |

### Bootstrap sequence (`main.ts`)

Services that need async init are resolved **after** `bootstrapApplication` resolves:
```
SettingsService.init() → QsoLogService.init() → ThemeService.init()
```
`ThemeService.init()` is synchronous but must run after settings are loaded.

### Reactivity pattern (Angular signals)

Pages use **intermediate primitive signals** to avoid unnecessary `ngOnChanges` triggers on `MapViewComponent`:

```typescript
// String intermediary → equality by === prevents re-runs when GPS ticks but grid stays the same
private readonly _gridStr = computed((): string => { ... });
readonly gridBounds = computed((): GridBounds | null => { ... }); // only re-runs on grid cross
```

This is critical for `MapViewComponent` — it does not use `ChangeDetectionStrategy.OnPush` but relies on stable object references to avoid destroying and recreating Leaflet layers on every GPS tick.

### `MapViewComponent`

- Standalone Leaflet map (not using `@bluehalo/ngx-leaflet` or similar wrappers).
- Leaflet marker icon paths are fixed at module load with `L.Icon.Default.mergeOptions` (standard Angular + Capacitor workaround).
- **Color constants are hardcoded** in the component (`MH_COLOR`, `OLC_COLOR`, `USER_DOT_COLOR`) because Leaflet reads JS options at draw time, not CSS variables. These values must match the dark-theme tokens in `variables.scss`.
- Exposes public API: `centerOnUser()`, `flyTo(pos, zoom)`, `invalidate()`.
- Layer toggle control (MH / OLC / ALL) is a custom `L.Control` built with `L.DomUtil`.

## Design system — "Terrain & Signal"

Theme tokens live in `src/theme/variables.scss`. Theme switching is CSS-attribute-driven:

- `[data-theme="dark"]` → dark (explicit)
- `[data-theme="light"]` → light (explicit)
- No attribute → `@media (prefers-color-scheme: dark)` decides (auto)

Key semantic tokens: `--ham-glow` (primary/grid), `--ham-amber` (Plus Code/frequency), `--ham-sky` (bearing/DX/user dot), `--ham-bg`, `--ham-surface`, `--ham-text`, `--ham-muted`.

Typography: `--app-font-mono` (`Share Tech Mono`) for grid/data values; `--app-font-ui` (`Barlow Condensed`) for labels.

## Key models

```typescript
// Position — output of GeolocationService on every GPS fix
interface Position { lat, lon, accuracy, altitude, grid4, grid6, grid8, plusCode, ts }

// QsoEntry — one radio contact log entry
interface QsoEntry { id, qsoDate (YYYYMMDD), timeOn (HHMMSS), call, band, mode,
                     rstSent, rstRcvd, dxGrid, myGrid, myPlusCode, distanceKm?, comment? }
```

## Capacitor plugins in use

`@capacitor/geolocation`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/clipboard`, `@capacitor/haptics`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/keyboard`.

After any native plugin change, run `npm run cap:sync`.

## Domain vocabulary

This is a **ham radio** app. Common terms: QTH (station location), QSO (radio contact), ADIF (Amateur Data Interchange Format — standard log export), RST (signal report), grid/locator = Maidenhead Grid Square (e.g. `FN20XR`), Plus Code = Open Location Code (e.g. `87G7PX7V+4H`), DX (distant station).

## Cambios atomicos
- Cada commit es una unidad de cambio lógico (ej: "Agregar servicio de geolocalización" o "Implementar página de registro de QSO").
- Evitar commits que mezclen funcionalidades no relacionadas (ej: no mezclar cambios de UI con lógica de negocio).
- Escribir mensajes de commit claros y descriptivos, siguiendo el formato:
```feat: Agregar servicio de geolocalización
fix: Corregir error en cálculo de grid
refactor: Extraer lógica de conversión a servicio dedicado
```
- Usar ramas para desarrollar nuevas funcionalidades o corregir errores, y hacer merge a `main` solo cuando el cambio esté completo y probado.
- Evita cambiar comentarios si no es necesario para el cambio que estás haciendo, para mantener el historial de cambios claro y enfocado.
- Planea los cambios antes de implementarlos para minimizar la cantidad de commits necesarios y evitar cambios innecesarios en el código.
- Si un cambio requiere mas de 10 lineas de código, considera dividirlo en varios commits lógicos para facilitar la revisión y el seguimiento de cambios. Presenta al usuario el plan de cambios antes de implementarlos para asegurarte de que estás alineado con lo que se espera.