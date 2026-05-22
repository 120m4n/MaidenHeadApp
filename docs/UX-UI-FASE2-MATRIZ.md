# UX/UI Fase 2 - Matriz Final de Tamano y Espaciado

Objetivo: consolidar un estandar unico para tipografia, separaciones y controles en toda la app.

## Tipografia

- Label de sistema y seccion:
  - font-size: var(--app-type-label-size) = 0.66rem
  - letter-spacing: var(--app-type-label-tracking) = 0.12em
  - font-weight: 600-700
  - uso: encabezados pequenos, labels de bloque, tabs, labels de formularios.

- Metadata:
  - font-size: var(--app-type-meta-size) = 0.72rem
  - letter-spacing: 0.04em-0.06em
  - font-weight: 400-600
  - uso: precision, coordenadas, hints, conteos.

- Valor primario:
  - fuente: var(--app-font-mono)
  - tracking: 0.04em
  - escala: clamp segun contexto
  - uso: grid, plus code, rumbo, distancia, callsign.

## Espaciado

- Margen horizontal base de superficie: 12px.
- Padding interno de tarjetas: 11px-14px.
- Separadores internos: 1px con var(--ham-border).
- Gap interno recomendado:
  - compactos: 4px-6px
  - lectura media: 8px-10px
  - bloques: 12px+

## Tarjetas y superficies

- Radio de tarjeta: var(--app-card-radius).
- Borde: 1px solid var(--ham-border).
- Sombra: var(--app-shadow-card).
- Superficie principal: var(--ham-surface).
- Superficie secundaria: var(--ham-surface2).

## Botones y controles

- Boton icon-only secundario (copy/share/delete/map):
  - minimo 44x44
  - border-radius: var(--app-radius-ctrl)
  - fondo: var(--ham-surface2)
  - borde: 1px solid var(--ham-muted)
  - color icono: var(--ham-text)
  - focus-visible obligatorio.

- CTA principal:
  - min-height: var(--app-cta-min-size)
  - tipografia uppercase UI 600-700.

## Mapa y layout vertical

- Layout de paginas con mapa: flex column en ion-content::part(scroll).
- Bloque de mapa: flex: 1 con min-height seguro.
- app-map-view: --map-height: 100% cuando deba ocupar espacio restante.

## Validacion

- Claro/oscuro:
  - icono sobre fondo de boton secundario: contraste alto (AA o superior).
  - borde de boton secundario visible en ambos temas.
- Responsive:
  - controles tactiles minimos de 44px.
  - evitar solapamientos FAB/controles/atribucion.
- Flujo:
  - acciones criticas visibles en primer escaneo.

## Estado de aplicacion

Aplicado en Home, Lookup, QSO Log, Settings, Tabs y componentes centrales de lectura/entrada (PositionCard, CopyButton, BearingIndicator, QsoFormModal).