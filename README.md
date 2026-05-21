# MaidenHeadApp

MaidenHeadApp es una aplicación móvil y web construida con Angular, Ionic y Capacitor para operadores de radio y usuarios que trabajan con localizadores geográficos. El foco principal es convertir, visualizar y registrar posiciones en formato Maidenhead Grid y Plus Codes, con soporte de mapa, geolocalización y log de QSOs.

## Qué resuelve

La app simplifica tareas repetitivas que suelen hacerse con varias herramientas distintas:

- Obtener el grid actual desde la ubicación GPS.
- Convertir coordenadas entre Maidenhead Grid y Plus Codes.
- Ver la posición y sus límites sobre un mapa interactivo.
- Registrar y exportar contactos radio QSO con datos de distancia y referencia.
- Guardar puntos y consultar ubicaciones desde una interfaz táctil pensada para móvil.

## Ventajas

- Una sola app para ubicación, conversión y registro.
- Funciona en Android, iOS y navegador con la misma base de código.
- Usa geolocalización en tiempo real para mantener actualizada la posición.
- Evita recálculos innecesarios al trabajar con estado reactivo y `computed`.
- Integra mapa, alertas, copiado rápido y exportación de datos.

## MainHead Grid

MainHead Grid es la parte de la app centrada en Maidenhead Grid. Permite resolver un grid a partir de coordenadas, dibujar sus límites, mostrar su centro aproximado y usarlo como referencia para búsquedas, mapa y QSOs. También ofrece validación de localizadores y soporte para precisiones 4, 6 y 8 caracteres.

## Open-Code plus

Open-Code plus trabaja con Plus Codes, también conocidos como Open Location Codes. La app puede codificar una posición en Plus Code, decodificar un código válido para recuperar centro y bounds, y cruzar ese dato con el grid Maidenhead para comparar ambas referencias sobre el mapa.

## Arquitectura

La estructura sigue una separación simple por responsabilidades:

- `src/app/pages`: pantallas principales de la aplicación.
- `src/app/components`: piezas reutilizables de interfaz como mapa, tarjetas, indicadores y formularios.
- `src/app/services`: lógica de negocio, geolocalización, Maidenhead, Plus Codes, orientación, ajustes y log de QSOs.
- `src/app/models`: tipos compartidos para posiciones y entradas de QSO.
- `src/app/pages/tabs`: navegación principal de la app.

### Flujo principal

1. La pantalla Home obtiene la posición actual y la convierte en grid y Plus Code.
2. Grid Lookup permite buscar una ubicación a partir de un grid o un Plus Code.
3. QSO Log guarda, exporta y limpia los contactos registrados.
4. Settings centraliza preferencias como precisión de grid y unidad de distancia.

## Tecnologías

- Angular 20
- Ionic 8
- Capacitor 8
- Leaflet para mapa interactivo
- Maidenhead Grid y Open Location Code para conversión geográfica

## Scripts útiles

- `npm start` para desarrollo.
- `npm run build` para compilación.
- `npm test` para pruebas.
- `npm run cap:sync` para sincronizar con Capacitor.
- `npm run cap:android` y `npm run cap:ios` para abrir las plataformas nativas.
