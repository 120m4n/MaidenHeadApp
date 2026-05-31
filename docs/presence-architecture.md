# Presence — Arquitectura de compartir posición entre usuarios

## Objetivo

Permitir que los usuarios de MaidenHeadApp vean en el mapa la posición en tiempo real
de otros usuarios activos, identificados por su callsign. El sistema debe:

- Ser **descentralizado** (sin lógica de negocio en el servidor)
- **Persistir** posiciones entre reinicios del contenedor
- Requerir **cambios mínimos** en la app principal
- Integrarse en el **monorepo** sin reestructurar el proyecto

---

## Tecnología central: NATS JetStream Key-Value

NATS es un sistema de mensajería pub/sub de alta performance. Su módulo
**JetStream** añade persistencia con almacenamiento en disco. El almacén
**Key-Value** (KV), construido sobre JetStream, es el modelo exacto para
este caso de uso:

| Concepto KV | Uso en Presence |
|---|---|
| Bucket | `MH_POSITIONS` — todas las posiciones activas |
| Key | callsign del usuario (`HK5YYY`) |
| Value | JSON con lat, lon, grid, accuracy, timestamp |
| TTL | 5 minutos — expiración automática si el cliente se desconecta |
| Storage | File — persiste entre reinicios del contenedor Docker |
| Watch | Iterator en tiempo real — el cliente recibe actualizaciones sin polling |

El paquete npm `nats` incluye cliente WebSocket nativo para browser.
**No se escribe código de servidor.**

---

## Monorepo layout — archivos nuevos o modificados

```
MaidenHeadApp/
├── presence/
│   └── nats.conf                          ← NUEVO — config JetStream + WS
│
├── src/app/
│   ├── models/
│   │   └── presence.model.ts              ← NUEVO — tipos de mensajes
│   ├── services/
│   │   └── presence.service.ts            ← NUEVO — cliente NATS KV
│   ├── pages/
│   │   ├── home/home.page.ts              ← efecto publish cada 15 s
│   │   └── settings/settings.page.*       ← toggle sharing + URL NATS
│   └── components/
│       └── map-view/map-view.component.ts ← @Input() peerMarkers
│
├── docker-compose.yml                     ← +servicio nats + volume nats-data
└── geojson.json                           ← sin cambios
```

**Dependencia npm nueva:** `nats` (~60 KB gzip, cliente oficial NATS).

---

## Tipos de mensajes

```typescript
// Almacenado en KV bucket "MH_POSITIONS"
// key  = callsign  (ej: "HK5YYY")
// value = PeerPosition serializado como JSON

interface PeerPosition {
  v:    1;        // versión de protocolo — permite evolución sin romper clientes
  call: string;   // callsign  "HK5YYY"
  lat:  number;
  lon:  number;
  grid: string;   // grid6  "FN20XR"
  acc:  number;   // accuracy en metros
  ts:   number;   // epoch ms
}

// Derivado en el cliente para el mapa
interface PeerMarker {
  callsign: string;
  pos:      LatLon;
  grid:     string;
  ts:       number;
  stale:    boolean;  // true cuando ts > 5 min → marcador atenuado en el mapa
}
```

---

## Flujo de datos

```
Browser A (HK5YYY)              NATS JetStream (Docker)           Browser B (YY5XXX)
──────────────────              ───────────────────────           ─────────────────────
PresenceService                                                   PresenceService
  │                                                                   │
  ├─ kv.put('HK5YYY', pos)  →  KV Bucket: MH_POSITIONS         →   watch() iterator
  │  cada 15 s                   key:   HK5YYY                        │
  │                              value: {lat,lon,grid,ts,...}         ├─ peers.set([...])
  │                              ttl:   5 min                         │
  │                              store: /data  (file)                 └─ mapa re-renderiza
  │
  └─ on destroy / sharing OFF:
     kv.delete('HK5YYY')    →  entry expira inmediatamente
```

---

## PresenceService API (Angular)

```typescript
@Injectable({ providedIn: 'root' })
export class PresenceService {
  readonly peers    = signal<PeerMarker[]>([]);   // posiciones de otros usuarios
  readonly online   = signal(false);              // conectado al servidor NATS
  readonly sharing  = signal(false);              // publicando propia posición

  // Conecta al servidor NATS vía WebSocket y arranca el watcher del KV bucket
  async connect(natsWsUrl: string): Promise<void>

  // Empieza a publicar posición GPS cada 15 s
  async startSharing(call: string): Promise<void>

  // Deja de publicar y elimina la entrada del KV (offline inmediato para otros)
  async stopSharing(call: string): Promise<void>

  // Cierra la conexión limpiamente (drain)
  disconnect(): void
}
```

**Interno:**
- `nc = await connect({ servers: url })` — WebSocket a NATS
- `kv = await js.views.kv('MH_POSITIONS', { ttl: 300_000 })` — bind al bucket
- `kv.put(callsign, encode(pos))` — publica posición
- `kv.watch()` — async iterator → actualiza `peers` signal en tiempo real
- Intervalo de publicación: 15 s
- TTL del bucket: 5 min (auto-expira si el cliente se desconecta sin avisar)

---

## Configuración NATS (`presence/nats.conf`)

```
jetstream {
  store_dir: /data        # persistencia en volumen Docker
}

websocket {
  port:    4223
  no_tls:  true           # TLS termina en el reverse proxy (nginx / Traefik)
}

# Sin autenticación en v1 (ham radio: callsign es identidad pública)
# Se puede añadir en v2 con: accounts { ... }
```

---

## Docker Compose — adición al `docker-compose.yml`

```yaml
  nats:
    image: nats:2.10-alpine
    container_name: nats-mh
    command: ["--config", "/etc/nats/nats.conf"]
    volumes:
      - ./presence/nats.conf:/etc/nats/nats.conf:ro
      - nats-data:/data
    ports:
      - "4222:4222"     # TCP — inter-service / CLI debug (nats CLI)
      - "4223:4223"     # WebSocket — conexión desde browsers
    restart: unless-stopped

volumes:
  nats-data:            # persiste posiciones entre reinicios del contenedor
```

---

## Cambios en la app principal

| Archivo | Tipo | Detalle |
|---|---|---|
| `presence.model.ts` | NUEVO | Tipos `PeerPosition`, `PeerMarker` |
| `presence.service.ts` | NUEVO | Cliente NATS KV completo |
| `settings.service.ts` | +2 campos | `locationSharing: boolean`, `natsUrl: string` |
| `settings.page.*` | +sección UI | Toggle on/off con confirmación + campo URL |
| `home.page.ts` | +effect | Publica posición GPS → NATS cuando sharing ON |
| `map-view.component.ts` | +1 @Input | `peerMarkers: PeerMarker[]` → icono callsign en mapa |
| `home.page.html` | +binding | `[peerMarkers]="peerMarkers()"` |

**Total: 2 archivos nuevos, 5 modificados.**

---

## Activación por el usuario

- **Sharing OFF por defecto** — privacidad primero.
- **Requiere callsign configurado** — el indicativo es la identidad en la red.
- **Confirmación explícita** al activar y al desactivar.
- El campo URL del servidor NATS permite apuntar a cualquier instancia
  (propia, comunitaria, etc.) sin compilar la app.

---

## Escalabilidad sin cambiar la app

| Escenario | Único cambio necesario |
|---|---|
| Single node (default) | — (diseño actual) |
| Alta disponibilidad | Cluster 3 nodos NATS en `docker-compose.yml` |
| Multi-región / leaf nodes | `nats.conf` + routes entre instancias |
| Autenticación por token | `accounts {}` en `nats.conf` + campo token en settings |

La app Angular solo conoce la URL del servidor WebSocket NATS.
Todos los escenarios de escala son **transparentes para el cliente**.

---

## Roadmap

| Fase | Feature |
|---|---|
| v1 (este doc) | Toggle ON/OFF con confirmación, callsign requerido |
| v2 | PresenceService + publicación automática + peers en mapa |
| v3 | URL configurable, indicador de conexión en UI |
| v4 | Autenticación por token, canales por región/red |
