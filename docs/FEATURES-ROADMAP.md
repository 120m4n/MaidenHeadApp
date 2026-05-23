# FEATURES ROADMAP — MaidenHeadApp

> Generado: 2026-05-22  
> Base de análisis: README.md, CLAUDE.md, PLAN-REDISENO.md, UX-UI-HOMOGENIZACION.md, UX-UI-FASE2-MATRIZ.md, código fuente actual.  
> Criterio de prioridad: valor para el operador en campo + esfuerzo de implementación.

---

## Estado del producto (baseline)

| Funcionalidad actual | Estado |
|----------------------|--------|
| GPS → Maidenhead Grid (4/6/8 chars) | ✅ |
| GPS → Plus Code | ✅ |
| Mapa interactivo (Leaflet + OSM) | ✅ |
| Grid Lookup (grid o Plus Code → mapa) | ✅ |
| QSO Log con export ADIF v3 | ✅ |
| Tema claro / oscuro / auto | ✅ |
| Pins guardados en mapa (long press) | ✅ parcial — sin UI de gestión |
| Chuleta de modos y RST | ✅ |
| Callsign + unidades de distancia en Settings | ✅ |

---

## Tabla de features propuestas

### 🔴 Alta prioridad — gaps directos del producto

| # | Feature | Problema que resuelve | Valor ★ | Esfuerzo | Estado |
|---|---------|----------------------|---------|---------|--------|
| F-01 | **Campo frecuencia en QSO** | El modelo no tiene `freq`. ADIF sin frecuencia pierde compatibilidad con LoTW, HAMRS, WSJTX. | ★★★★★ | S | 🔲 pendiente |
| F-02 | **Editar QSO** | Solo existe borrar. Un error en el callsign obliga a recrear todo el registro. | ★★★★★ | S | 🔲 pendiente |
| F-03 | **Filtro y búsqueda en QSO Log** | Lista plana sin búsqueda. Con 100+ QSOs es inutilizable para encontrar un contacto. | ★★★★☆ | S | 🔲 pendiente |
| F-04 | **Gestión de pins guardados** | `savedPins` existe en Home pero no hay UI para ver, nombrar ni borrar pins. Feature incompleta. | ★★★★☆ | M | 🔲 pendiente |
| F-05 | **Alerta/haptic de cambio de grid** | Al cruzar al siguiente cuadro Maidenhead no hay notificación. Crítico en SOTA/POTA y activaciones portable. | ★★★★☆ | S | 🔲 pendiente |

---

### 🟡 Media prioridad — amplían el valor diferencial

| # | Feature | Problema que resuelve | Valor ★ | Esfuerzo | Estado |
|---|---------|----------------------|---------|---------|--------|
| F-06 | **Estadísticas del log** | No hay resumen. El operador no sabe cuántos grids únicos ha trabajado, cuál es su QSO de mayor distancia ni distribución por banda/modo. | ★★★★☆ | M | 🔲 pendiente |
| F-07 | **Mapa de QSOs** | Visualizar líneas desde MY GRID a DX GRID. Los datos ya existen en el log; solo falta la capa Leaflet. | ★★★★☆ | M | 🔲 pendiente |
| F-08 | **Importar ADIF** | Sin import, el operador con log previo (WSJTX, LoTW, HAMRS) empieza desde cero y no adopta la app. | ★★★★☆ | M | 🔲 pendiente |
| F-09 | **Índices de propagación** | Sin datos de solar flux / K-index / A-index el operador no sabe en qué banda operar antes de encender el equipo. API pública: NOAA/spaceweather. | ★★★★☆ | M | 🔲 pendiente |
| F-10 | **Lookup de indicativo (QRZ/HamQTH)** | Desde el formulario QSO y el log, abrir perfil del corresponsal para ver nombre, QTH y foto. | ★★★☆☆ | S | 🔲 pendiente |
| F-11 | **Dark map tiles** | En modo oscuro el mapa blanco rompe la experiencia nocturna. CartoDB Dark Matter es OSM-compatible y gratuito. | ★★★☆☆ | S | 🔲 pendiente |
| F-12 | **Múltiples perfiles QTH** | Un callsign suele operar desde casa, portable y coche. Cada perfil guarda callsign, grid base y unidades. | ★★★☆☆ | M | 🔲 pendiente |

---

### 🟢 Baja prioridad — diferenciadores avanzados

| # | Feature | Problema que resuelve | Valor ★ | Esfuerzo | Estado |
|---|---------|----------------------|---------|---------|--------|
| F-13 | **SOTA/POTA — activaciones cercanas** | Mostrar en mapa cumbres y parques activables cerca del GPS. API pública: api.sota.org.uk, api.pota.app. | ★★★★☆ | L | 🔲 pendiente |
| F-14 | **Línea gris (Grayline)** | El terminator día/noche sobre el mapa marca la ventana de propagación óptima en HF. Cálculo local, sin API. | ★★★☆☆ | M | 🔲 pendiente |
| F-15 | **Grids trabajados — heat map** | Colorear en el mapa los cuadros ya trabajados (datos del log). Visual, motivador, útil para el premio VUCC. | ★★★☆☆ | L | 🔲 pendiente |
| F-16 | **Repetidores cercanos** | Frecuencia, tono CTCSS y distancia de repetidores VHF/UHF próximos. API: RepeaterBook. | ★★☆☆☆ | L | 🔲 pendiente |
| F-17 | **DX Cluster — spots en vivo** | Estaciones DX activas en tiempo real vía WebSocket o API. Gran valor, alta complejidad de datos. | ★★★☆☆ | L | 🔲 pendiente |
| F-18 | **Backup/restaurar en JSON** | Exportar e importar el log completo en JSON. Más datos que ADIF; protege ante borrado accidental. | ★★☆☆☆ | S | 🔲 pendiente |
| F-19 | **Widget de pantalla de inicio** | Grid actual en widget nativo Android/iOS. Requiere Capacitor plugin custom o solución nativa. | ★★★☆☆ | L | 🔲 pendiente |
| F-20 | **Seguimiento de premios (VUCC/DXCC)** | Contador de grids únicos y entidades DXCC trabajadas, derivado del log. Gamifica el uso. | ★★★☆☆ | L | 🔲 pendiente |

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ★★★★★ | Imprescindible — afecta uso básico o estándar del dominio |
| ★★★★☆ | Alta — añade valor real sin complejidad desproporcionada |
| ★★★☆☆ | Media — diferenciador pero no crítico |
| ★★☆☆☆ | Baja — nice to have |
| **S** | Esfuerzo pequeño — < 200 líneas, un componente o servicio |
| **M** | Esfuerzo medio — 200-600 líneas, servicio nuevo + UI |
| **L** | Esfuerzo grande — API externa, plugin nativo o múltiples pantallas |
| 🔲 | Pendiente |
| 🚧 | En desarrollo |
| ✅ | Completado |

---

## Secuencia recomendada de implementación

### Sprint 1 — Calidad del log (todo esfuerzo S)
1. F-02 Editar QSO
2. F-01 Campo frecuencia en QSO
3. F-03 Filtro/búsqueda en QSO Log
4. F-05 Alerta/haptic de cambio de grid

### Sprint 2 — Riqueza de datos
5. F-06 Estadísticas del log
6. F-07 Mapa de QSOs
7. F-08 Importar ADIF
8. F-11 Dark map tiles

### Sprint 3 — Conectividad y contexto
9. F-09 Índices de propagación
10. F-10 Lookup de indicativo
11. F-04 Gestión de pins guardados
12. F-12 Múltiples perfiles QTH

### Sprint 4 — Diferenciadores avanzados
13. F-14 Línea gris (Grayline)
14. F-13 SOTA/POTA activaciones cercanas
15. F-15 Grids trabajados heat map
16. F-18 Backup/restaurar JSON
17. F-20 Seguimiento de premios

### Sprint 5 — Integraciones nativas
18. F-16 Repetidores cercanos
19. F-17 DX Cluster spots
20. F-19 Widget de pantalla de inicio

---

## Notas de arquitectura por feature

### F-01 Campo frecuencia en QSO
- Añadir `freq?: string` a `QsoEntry` (ej. `"14.225"` en MHz)
- Añadir campo en `QsoFormModalComponent` entre Banda y Modo
- Añadir `<FREQ:...>` al builder ADIF en `QsoLogService.buildRecord()`
- Migración: campo opcional → registros existentes no se rompen

### F-02 Editar QSO
- Reutilizar `QsoFormModalComponent` con `@Input() editEntry?: QsoEntry`
- En QSO Log, botón editar en cada card abre el modal prefilled
- `QsoLogService.update(entry)` reemplaza por id

### F-03 Filtro en QSO Log
- Signal `filterQuery` en `QsoLogPage` → computed con `.filter()`
- Input de búsqueda en el header del log (collapsible para no perder espacio)
- Filtrar por: callsign substring, banda, modo

### F-04 Gestión de pins
- Nueva sección en Settings o modal propio
- `SavedPin` model: `{ id, label, lat, lon, grid, ts }`
- `PinsService` análogo a `QsoLogService`

### F-05 Alerta de cambio de grid
- `GeolocationService` ya emite `position` con `grid6`
- `effect()` que compara grid anterior vs nuevo → `Haptics.vibrate()` + toast
- Opción en Settings para activar/desactivar

### F-07 Mapa de QSOs
- Nueva capa Leaflet en `MapViewComponent` (toggle en el control de capas existente)
- `L.polyline([myGridCenter, dxGridCenter])` por cada QSO con dxGrid
- Color `--ham-sky`, opacidad 0.5

### F-08 Importar ADIF
- Parser ADIF: regex sobre campos `<TAG:LEN>VALUE`
- Input file (`<input type="file" accept=".adi,.adif">`)
- Merge por id compuesto `call+date+timeOn` para evitar duplicados

### F-09 Propagación
- API pública NOAA: `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
- Solar flux: `https://services.swpc.noaa.gov/products/10cm-flux-30-day.json`
- `PropagationService` con `resource()` Angular para fetch reactivo
- Widget compacto en Settings o nueva micro-sección en Home

### F-11 Dark map tiles
- CartoDB Dark Matter: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- En `MapViewComponent`, observar `data-theme` → cambiar `tileLayer` URL
- Sin coste, atribución requerida: `© CARTO`

### F-14 Grayline
- Cálculo del terminator: fórmula astronómica local (sin API), por hora UTC
- Capa Leaflet polygon semitransparente sobre el hemisferio nocturno
- Actualizar cada minuto con `setInterval`
