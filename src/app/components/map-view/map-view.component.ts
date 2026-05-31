import {
  Component, Input, Output, EventEmitter, OnDestroy,
  AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges,
} from '@angular/core';
import * as L from 'leaflet';
import type * as GeoJSON from 'geojson';
import { LatLon, GridBounds } from '../../models/position.model';
import { PeerMarker } from '../../models/presence.model';
import {
  haversineMeters, bearingDecimal, geoJsonPointLatLon,
  arrowLabelMode, formatArrowLabel,
} from '../../utils/geojson-arrow.utils';

// ── Peer marker icon — función pura para evitar recreación inline ────────────
const PEER_DENSE_THRESHOLD = 50;

function buildPeerIcon(callsign: string, stale: boolean): L.DivIcon {
  const cls = stale ? ' peer-marker--stale' : '';
  return L.divIcon({
    html: `<div class="peer-marker${cls}">
             <div class="peer-marker__ring"></div>
             <div class="peer-marker__dot"></div>
             <span class="peer-marker__call">${callsign}</span>
           </div>`,
    className: 'peer-icon-container',
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
  });
}

// Fix leaflet marker icons para Angular + Capacitor
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

// ── Colores Leaflet: se leen desde variables CSS activas de tema ──────────
const USER_DOT_BORDER = '#ffffff';

interface MapThemeColors {
  userDot: string;
  mh: string;
  olc: string;
  tap: string;
}

export type GridLayer = 'mh' | 'olc' | 'both';

export interface MapTapEvent {
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-map-view',
  template: `<div #mapContainer class="map-container"></div>`,
  styles: [`
    :host {
      display:   block;
      /* width NO se fija a 100%: en flex column, align-self:stretch (default)
         ya asigna el ancho correcto respetando el margin horizontal del padre.
         Fijar width:100% ignora los márgenes y provoca overflow lateral. */
    }
    .map-container {
      width:         100%;
      /* Fallback 100%: cuando el :host es un flex-item el browser puede resolver
         height:100% contra la altura asignada por el flex-algorithm.
         --map-height se puede sobreescribir desde el padre (ej: grid-lookup).  */
      height:        var(--map-height, 100%);
      border-radius: var(--app-card-radius, 3px);
      overflow:      hidden;
    }
  `],
})
export class MapViewComponent implements AfterViewInit, OnDestroy, OnChanges {
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private themeAttrObserver?: MutationObserver;
  private themeMediaListener?: (event: MediaQueryListEvent) => void;
  private colors: MapThemeColors = this.resolveThemeColors();

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ── Inputs ──────────────────────────────────────────────────────────────
  /** Vista inicial del mapa (antes de cualquier GPS fix o resultado de búsqueda) */
  @Input() initialCenter: LatLon | null = null;
  @Input() initialZoom:   number = 2;

  @Input() center:      LatLon | null  = null;
  @Input() accuracy:    number | null  = null;

  /** Bounds del grid Maidenhead + label (ej: "FN20XR") */
  @Input() gridBounds:  GridBounds | null = null;
  @Input() gridLabel:   string = '';

  /** Bounds del Plus Code + label (ej: "87G7PX7V+4H") */
  @Input() plusBounds:  GridBounds | null = null;
  @Input() plusLabel:   string = '';

  /** Grid temporal de tap (azul) — se borra al mismo tiempo que el toast */
  @Input() tapGridBounds: GridBounds | null = null;
  @Input() tapGridLabel:  string = '';

  @Input() savedMarkers: Array<{ pos: LatLon; label: string }> = [];
  @Input() geoJsonUrl: string | null = null;

  /** Punto de destino para la flecha distancia/rumbo (null = sin flecha) */
  @Input() arrowTarget: LatLon | null = null;

  /** Posiciones de otros usuarios en la red */
  @Input() peerMarkers: PeerMarker[] = [];

  // ── Outputs ─────────────────────────────────────────────────────────────
  @Output() mapTap          = new EventEmitter<MapTapEvent>();
  @Output() mapLongPress    = new EventEmitter<MapTapEvent>();
  /** Emite el LatLon de la feature GeoJSON más cercana al tap (50 px), o null si no hay. */
  @Output() geoJsonFeatureTap = new EventEmitter<LatLon | null>();

  // ── Capas internas ───────────────────────────────────────────────────────
  private map!: L.Map;
  private userDot?:      L.CircleMarker;
  private accuracyRing?: L.Circle;
  private mhRect?:       L.Rectangle;   // Maidenhead grid rect
  private mhLabel?:      L.Tooltip;     // Maidenhead label — esquina NW del rect
  private olcRect?:      L.Rectangle;   // Plus Code / OLC grid rect
  private olcLabel?:     L.Tooltip;     // OLC label — esquina NW del rect
  private tapRect?:      L.Rectangle;   // Grid temporal de tap (azul)
  private tapLabelTip?:  L.Tooltip;     // Label del tap grid
  private savedLayers:   L.Marker[] = [];
  private geoJsonLayer?: L.GeoJSON;
  private peerLayers: Map<string, L.Marker> = new Map();
  private geoJsonFeatures: GeoJSON.Feature[] = [];

  // ── Capas de la flecha distancia/rumbo ───────────────────────────────────
  private arrowPolyline?:    L.Polyline;
  private arrowHeadMarker?:  L.Marker;
  private arrowTooltip?:     L.Tooltip;

  private readonly geoJsonPointIcon = L.icon({
    iconUrl: '/icons/antenna.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    tooltipAnchor: [0, -12],
    popupAnchor: [0, -12],
  });

  // ── Estado del selector de capas ─────────────────────────────────────────
  private activeLayer: GridLayer = 'both';
  private locateBtn?:  HTMLButtonElement;
  private layerBtns?:  Record<GridLayer, HTMLButtonElement>;

  // Auto-zoom solo en el primer fix GPS
  private firstFix = true;

  // IDs de timers pendientes — se cancelan en ngOnDestroy
  private initTimer?:     ReturnType<typeof setTimeout>;
  private invalidateTimer?: ReturnType<typeof setTimeout>;

  // Observa cambios de tamaño del contenedor (flex/rotación) y avisa a Leaflet
  private resizeObserver?: ResizeObserver;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.initMap();
    this.setupResizeObserver();
    this.startThemeSync();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['center'] || changes['accuracy'])
      this.updateUserMarker();

    if (changes['gridBounds'])
      this.updateMhRect();
    else if (changes['gridLabel'])
      this.mhLabel?.setContent(this.gridLabel || ' ');

    if (changes['plusBounds'])
      this.updateOlcRect();
    else if (changes['plusLabel'])
      this.olcLabel?.setContent(this.plusLabel || ' ');

    if (changes['tapGridBounds'])
      this.updateTapRect();
    else if (changes['tapGridLabel'])
      this.tapLabelTip?.setContent(this.tapGridLabel || ' ');

    if (changes['savedMarkers'])
      this.updateSavedMarkers();

    if (changes['geoJsonUrl'])
      void this.loadGeoJsonLayer();

    if (changes['arrowTarget'])
      this.updateArrow();

    if (changes['peerMarkers'])
      this.updatePeerMarkers();
  }

  ngOnDestroy(): void {
    this.themeAttrObserver?.disconnect();
    if (this.themeMediaListener) {
      this.mediaQuery.removeEventListener('change', this.themeMediaListener);
    }
    this.resizeObserver?.disconnect();
    clearTimeout(this.initTimer);
    clearTimeout(this.invalidateTimer);
    this.clearArrow();
    this.peerLayers.forEach(m => m.remove());
    this.peerLayers.clear();
    this.map?.remove();
  }

  private startThemeSync(): void {
    this.colors = this.resolveThemeColors();
    this.applyThemeToMapLayers();

    this.themeAttrObserver = new MutationObserver(() => {
      this.colors = this.resolveThemeColors();
      this.applyThemeToMapLayers();
    });

    this.themeAttrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    this.themeMediaListener = () => {
      if (!document.documentElement.hasAttribute('data-theme')) {
        this.colors = this.resolveThemeColors();
        this.applyThemeToMapLayers();
      }
    };

    this.mediaQuery.addEventListener('change', this.themeMediaListener);
  }

  private cssVar(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }

  private resolveThemeColors(): MapThemeColors {
    return {
      userDot: this.cssVar('--ham-sky', '#5ab0e8'),
      mh: this.cssVar('--mh-map-color', '#5E35B1'),
      olc: this.cssVar('--ham-amber', '#d4923e'),
      tap: this.cssVar('--ham-sky', '#5ab0e8'),
    };
  }

  private applyThemeToMapLayers(): void {
    if (!this.map) return;

    if (this.accuracyRing) {
      this.accuracyRing.setStyle({
        color: this.colors.userDot,
        fillColor: this.colors.userDot,
      });
    }

    if (this.userDot) {
      this.userDot.setStyle({
        color: USER_DOT_BORDER,
        fillColor: this.colors.userDot,
      });
    }

    if (this.mhRect) {
      this.mhRect.setStyle({
        color: this.colors.mh,
        fillColor: this.colors.mh,
      });
    }

    if (this.olcRect) {
      this.olcRect.setStyle({
        color: this.colors.olc,
        fillColor: this.colors.olc,
      });
    }

    if (this.tapRect) {
      this.tapRect.setStyle({
        color: this.colors.tap,
        fillColor: this.colors.tap,
      });
    }

    this.refreshLayerControlDots();
  }

  private refreshLayerControlDots(): void {
    if (!this.layerBtns) return;

    for (const layer of Object.keys(this.layerBtns) as GridLayer[]) {
      const btn = this.layerBtns[layer];
      const dots = btn.querySelectorAll('.mlc-dot');

      if (layer === 'mh' && dots[0]) {
        (dots[0] as HTMLElement).style.background = this.colors.mh;
      } else if (layer === 'olc' && dots[0]) {
        (dots[0] as HTMLElement).style.background = this.colors.olc;
      } else if (layer === 'both') {
        if (dots[0]) (dots[0] as HTMLElement).style.background = this.colors.mh;
        if (dots[1]) (dots[1] as HTMLElement).style.background = this.colors.olc;
      }
    }
  }

  // ── Inicialización ───────────────────────────────────────────────────────

  private initMap(): void {
    const el = this.mapContainer.nativeElement;
    // NOTA: NO se fuerza height inline — el tamaño viene del CSS (flex / --map-height).
    // Si el contenedor aún tiene height=0 en este momento (iOS / WKWebView), el
    // ResizeObserver llamará invalidateSize() en cuanto el layout se establezca.

    const initLat  = this.initialCenter?.lat  ?? 0;
    const initLon  = this.initialCenter?.lon  ?? 0;
    const initZoom = this.initialCenter ? this.initialZoom : 2;

    this.map = L.map(el, { zoomControl: true, attributionControl: true })
      .setView([initLat, initLon], initZoom);

    this.map.zoomControl.setPosition('topright');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.addLayerToggleControl();
    this.addLocateControl();
    this.addMapEventHandlers();
    this.map.on('zoomend', () => {
      this.refreshArrowLabel();
      this.syncGeoJsonLabelVisibility();
    });

    if (this.center)              this.updateUserMarker();
    if (this.gridBounds)          this.updateMhRect();
    if (this.plusBounds)          this.updateOlcRect();
    if (this.tapGridBounds)       this.updateTapRect();
    if (this.savedMarkers.length) this.updateSavedMarkers();
    void this.loadGeoJsonLayer();

    this.initTimer = setTimeout(() => this.map.invalidateSize(), 200);
  }

  private async loadGeoJsonLayer(): Promise<void> {
    this.geoJsonLayer?.remove();
    this.geoJsonLayer = undefined;
    this.geoJsonFeatures = [];

    if (!this.map || !this.geoJsonUrl) return;

    try {
      const response = await fetch(this.geoJsonUrl);
      if (!response.ok) return;

      const geoJson: GeoJSON.FeatureCollection = await response.json();
      this.geoJsonFeatures = geoJson.features ?? [];
      this.geoJsonLayer = L.geoJSON(geoJson, {
        pointToLayer: (feature, latlng) => {
          const props = (feature.properties ?? {}) as Record<string, string>;
          const nombre   = props['nombre']   ?? '';
          const conexion = props['conexion'] ?? '';
          const html = [nombre, conexion].filter(Boolean).join('<br>');

          const marker = L.marker(latlng, { icon: this.geoJsonPointIcon });
          if (html) {
            marker.bindTooltip(html, {
              permanent:   true,
              direction:   'right',
              className:   'map-geojson-label',
              interactive: false,
              offset:      [4, 0],
            });
          }
          return marker;
        },
      }).addTo(this.map);
      this.syncGeoJsonLabelVisibility();
    } catch {
      // Si falla la carga del archivo, el mapa sigue funcionando sin esta capa.
    }
  }

  // ── ResizeObserver: sincroniza Leaflet con el tamaño real del contenedor ──
  // Esto resuelve dos problemas en iOS/WKWebView:
  //   1. El layout flex no está calculado cuando ngAfterViewInit dispara →
  //      el mapa se inicializa con height=0 y los tiles no se cargan bien.
  //   2. Cambios posteriores de tamaño (rotación, show/hide de elementos) no
  //      eran notificados a Leaflet, dejando zonas grises.

  private setupResizeObserver(): void {
    const el = this.mapContainer.nativeElement;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && this.map) {
          // animate: false evita flicker visual al redimensionar
          this.map.invalidateSize({ animate: false });
        }
      }
    });

    this.resizeObserver.observe(el);
  }

  // ── Control: selector de capas MH / OLC / ALL ────────────────────────────

  private addLayerToggleControl(): void {
    const self = this;

    const LayerControl = L.Control.extend({
      onAdd(_map: L.Map) {
        const wrap = L.DomUtil.create('div', 'map-layer-ctrl');

        const btns = {
          mh:   self.makeLayerBtn(wrap, 'mh',   'MH'),
          olc:  self.makeLayerBtn(wrap, 'olc',  'OLC'),
          both: self.makeLayerBtn(wrap, 'both', 'ALL'),
        };
        self.layerBtns = btns;
        self.syncLayerBtns();

        L.DomEvent.disableClickPropagation(wrap);
        return wrap;
      },
      onRemove() {},
    });

    new LayerControl({ position: 'topleft' }).addTo(this.map);
  }

  private makeLayerBtn(
    parent: HTMLElement,
    layer: GridLayer,
    text: string,
  ): HTMLButtonElement {
    const btn = L.DomUtil.create('button', 'mlc-btn', parent) as HTMLButtonElement;
    btn.setAttribute('data-layer', layer);
    btn.title = layer === 'mh'  ? 'Maidenhead grid'
              : layer === 'olc' ? 'Plus Code grid'
              : 'Ambas capas';

    // Dot(s) de color
    if (layer === 'both') {
      const d1 = document.createElement('span');
      d1.className = 'mlc-dot';
      d1.style.background = this.colors.mh;
      const d2 = document.createElement('span');
      d2.className = 'mlc-dot';
      d2.style.background = this.colors.olc;
      btn.appendChild(d1);
      btn.appendChild(d2);
    } else {
      const dot = document.createElement('span');
      dot.className = 'mlc-dot';
      dot.style.background = layer === 'mh' ? this.colors.mh : this.colors.olc;
      btn.appendChild(dot);
    }

    const label = document.createElement('span');
    label.textContent = text;
    btn.appendChild(label);

    L.DomEvent.on(btn, 'click', () => {
      this.activeLayer = layer;
      this.syncLayerBtns();
      this.applyLayerVisibility();
    });

    return btn;
  }

  private syncLayerBtns(): void {
    if (!this.layerBtns) return;
    (Object.keys(this.layerBtns) as GridLayer[]).forEach(k => {
      this.layerBtns![k].classList.toggle('mlc-btn--active', k === this.activeLayer);
    });
  }

  private applyLayerVisibility(): void {
    const showMH  = this.activeLayer !== 'olc';
    const showOLC = this.activeLayer !== 'mh';

    if (this.mhRect)   { showMH  ? this.mhRect.addTo(this.map)   : this.mhRect.remove(); }
    if (this.mhLabel)  { showMH  ? this.mhLabel.addTo(this.map)  : this.mhLabel.remove(); }
    if (this.olcRect)  { showOLC ? this.olcRect.addTo(this.map)  : this.olcRect.remove(); }
    if (this.olcLabel) { showOLC ? this.olcLabel.addTo(this.map) : this.olcLabel.remove(); }
  }

  // ── Control: botón "centrar en mi posición" ──────────────────────────────

  private addLocateControl(): void {
    const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
         viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2"  x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="2"  y1="12" x2="6"  y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
    </svg>`;

    const LocateControl = L.Control.extend({
      onAdd: (_map: L.Map) => {
        const btn = L.DomUtil.create('button', 'map-locate-btn') as HTMLButtonElement;
        btn.title = 'Centrar en mi posición';
        btn.setAttribute('aria-label', 'Centrar mapa en mi posición');
        btn.innerHTML = SVG;
        btn.disabled  = !this.center;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => this.centerOnUser());
        this.locateBtn = btn;
        return btn;
      },
      onRemove: () => {},
    });

    new LocateControl({ position: 'topright' }).addTo(this.map);
  }

  // ── Handlers del mapa ────────────────────────────────────────────────────

  private addMapEventHandlers(): void {
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapTap.emit({ lat: e.latlng.lat, lon: e.latlng.lng });
      this.emitNearbyGeoJsonFeature(e.latlng);
    });

    let pressTimer: ReturnType<typeof setTimeout>;
    let pressPos: L.LatLng | null = null;

    this.map.on('mousedown touchstart', (evt: L.LeafletEvent) => {
      const e = evt as L.LeafletMouseEvent;
      pressPos   = e.latlng;
      pressTimer = setTimeout(() => {
        if (pressPos) {
          this.mapLongPress.emit({ lat: pressPos.lat, lon: pressPos.lng });
          pressPos = null;
        }
      }, 600);
    });
    this.map.on('mouseup touchend mousemove touchmove', () => {
      clearTimeout(pressTimer);
      pressPos = null;
    });
  }

  // ── Marcador de usuario ──────────────────────────────────────────────────

  private updateUserMarker(): void {
    if (this.locateBtn) this.locateBtn.disabled = !this.center;

    if (!this.center) {
      this.userDot?.remove();
      this.accuracyRing?.remove();
      this.userDot = this.accuracyRing = undefined;
      return;
    }

    const ll = L.latLng(this.center.lat, this.center.lon);

    // Anillo de precisión
    const acc = this.accuracy;
    if (acc && acc > 0) {
      if (this.accuracyRing) {
        this.accuracyRing.setLatLng(ll);
        this.accuracyRing.setRadius(acc);
      } else {
        this.accuracyRing = L.circle(ll, {
          radius: acc, fillColor: this.colors.userDot, fillOpacity: 0.08,
          color: this.colors.userDot, weight: 1.5, dashArray: '5 5',
          interactive: false, className: 'accuracy-ring',
        }).addTo(this.map);
      }
    } else {
      this.accuracyRing?.remove();
      this.accuracyRing = undefined;
    }

    // Punto azul
    if (this.userDot) {
      this.userDot.setLatLng(ll);
    } else {
      this.userDot = L.circleMarker(ll, {
        radius: 9, fillColor: this.colors.userDot, fillOpacity: 1,
        color: USER_DOT_BORDER, weight: 2.5,
        interactive: false, className: 'user-dot',
      }).addTo(this.map);
    }

    if (this.firstFix) { this.firstFix = false; this.map.setView(ll, 13); }
  }

  // ── Maidenhead rect (teal) ──────────────────────────────────────────────

  private updateMhRect(): void {
    this.mhRect?.remove();
    this.mhLabel?.remove();
    this.mhRect  = undefined;
    this.mhLabel = undefined;
    if (!this.gridBounds) return;

    const { sw, ne } = this.gridBounds;
    this.mhRect = L.rectangle(
      [[sw.lat, sw.lon], [ne.lat, ne.lon]],
      {
        color: this.colors.mh, weight: 2.0,
        fillColor: this.colors.mh, fillOpacity: 0.09,
        dashArray: '4 4',
        className: 'mh-rect',
      },
    );

    if (this.gridLabel) {
      // Label anclado en el vértice NW (esquina superior-izquierda) del rect.
      // direction:'right' coloca el borde izquierdo del tooltip en el punto
      // geográfico; offset [4, 10] compensa ~la mitad de la altura del tooltip
      // para que el borde superior quede sobre el borde del grid.
      this.mhLabel = L.tooltip({
        permanent:   true,
        direction:   'right',
        className:   'map-grid-label map-grid-label--mh',
        interactive: false,
        offset:      [4, 10],
      })
      .setLatLng([ne.lat, sw.lon])   // NW corner: lat más alta, lon más occidental
      .setContent(this.gridLabel);
    }

    // Añadir sólo si la capa está activa
    if (this.activeLayer !== 'olc') {
      this.mhRect.addTo(this.map);
      this.mhLabel?.addTo(this.map);
    }
  }

  // ── Plus Code / OLC rect (ámbar) ────────────────────────────────────────

  private updateOlcRect(): void {
    this.olcRect?.remove();
    this.olcLabel?.remove();
    this.olcRect  = undefined;
    this.olcLabel = undefined;
    if (!this.plusBounds) return;

    const { sw, ne } = this.plusBounds;
    this.olcRect = L.rectangle(
      [[sw.lat, sw.lon], [ne.lat, ne.lon]],
      {
        color: this.colors.olc, weight: 1.5,
        fillColor: this.colors.olc, fillOpacity: 0.12,
        className: 'olc-rect',
      },
    );

    if (this.plusLabel) {
      // Mismo patrón que MH: label en esquina NW, dirección right + offset vertical
      this.olcLabel = L.tooltip({
        permanent:   true,
        direction:   'right',
        className:   'map-grid-label map-grid-label--olc',
        interactive: false,
        offset:      [4, 10],
      })
      .setLatLng([ne.lat, sw.lon])   // NW corner
      .setContent(this.plusLabel);
    }

    // Añadir sólo si la capa está activa
    if (this.activeLayer !== 'mh') {
      this.olcRect.addTo(this.map);
      this.olcLabel?.addTo(this.map);
    }
  }

  // ── Grid temporal de tap (azul) ─────────────────────────────────────────

  private updateTapRect(): void {
    this.tapRect?.remove();
    this.tapLabelTip?.remove();
    this.tapRect     = undefined;
    this.tapLabelTip = undefined;
    if (!this.tapGridBounds) return;

    const { sw, ne } = this.tapGridBounds;
    this.tapRect = L.rectangle(
      [[sw.lat, sw.lon], [ne.lat, ne.lon]],
      {
        color:       this.colors.tap,
        weight:      2,
        fillColor:   this.colors.tap,
        fillOpacity: 0.14,
        dashArray:   '5 4',
        className:   'tap-rect',
      },
    ).addTo(this.map);

    if (this.tapGridLabel) {
      this.tapLabelTip = L.tooltip({
        permanent:   true,
        direction:   'right',
        className:   'map-grid-label map-grid-label--tap',
        interactive: false,
        offset:      [4, 10],
      })
      .setLatLng([ne.lat, sw.lon])   // esquina NW
      .setContent(this.tapGridLabel)
      .addTo(this.map);
    }
  }

  // ── Pins guardados ───────────────────────────────────────────────────────

  private updateSavedMarkers(): void {
    this.savedLayers.forEach(m => m.remove());
    this.savedLayers = [];
    this.savedMarkers.forEach(({ pos, label }) => {
      const m = L.marker([pos.lat, pos.lon])
        .bindTooltip(label, { permanent: false })
        .addTo(this.map);
      this.savedLayers.push(m);
    });
  }

  // ── Marcadores de peers (otros usuarios en la red) ───────────────────────

  private updatePeerMarkers(): void {
    const container = this.mapContainer?.nativeElement;

    // Fast path: sin peers → limpiar todo y salir
    if (this.peerMarkers.length === 0) {
      this.peerLayers.forEach(m => m.remove());
      this.peerLayers.clear();
      container?.classList.remove('peer-dense');
      return;
    }

    const active = new Set(this.peerMarkers.map(p => p.callsign));

    // Recolecta y elimina markers de peers que ya no están (evita mutación durante iteración)
    const toRemove: string[] = [];
    for (const [call, marker] of this.peerLayers) {
      if (!active.has(call)) { marker.remove(); toRemove.push(call); }
    }
    toRemove.forEach(c => this.peerLayers.delete(c));

    // Modo denso: deshabilita animación CSS cuando hay más de 50 peers
    const dense = this.peerMarkers.length > PEER_DENSE_THRESHOLD;
    container?.classList.toggle('peer-dense', dense);

    for (const peer of this.peerMarkers) {
      const ll   = L.latLng(peer.pos.lat, peer.pos.lon);
      const icon = buildPeerIcon(peer.callsign, peer.stale);

      const existing = this.peerLayers.get(peer.callsign);
      if (existing) {
        existing.setLatLng(ll);
        existing.setIcon(icon);
      } else {
        this.peerLayers.set(
          peer.callsign,
          L.marker(ll, { icon, interactive: false }).addTo(this.map),
        );
      }
    }
  }

  // ── Flecha distancia/rumbo a feature GeoJSON ─────────────────────────────

  private syncGeoJsonLabelVisibility(): void {
    if (!this.geoJsonLayer) return;
    const show = this.map.getZoom() >= 11;
    this.geoJsonLayer.getLayers().forEach(layer => {
      const marker = layer as L.Marker;
      if (!marker.getTooltip()) return;
      show ? marker.openTooltip() : marker.closeTooltip();
    });
  }

  private emitNearbyGeoJsonFeature(tapLatLng: L.LatLng): void {
    const THRESHOLD_PX = 50;
    const tapPt = this.map.latLngToContainerPoint(tapLatLng);
    let nearest: GeoJSON.Feature | null = null;
    let minDist = Infinity;

    for (const feature of this.geoJsonFeatures) {
      const coords = geoJsonPointLatLon(feature);
      if (!coords) continue;
      const pt = this.map.latLngToContainerPoint(L.latLng(coords.lat, coords.lon));
      const dist = Math.hypot(tapPt.x - pt.x, tapPt.y - pt.y);
      if (dist < THRESHOLD_PX && dist < minDist) {
        minDist = dist;
        nearest = feature;
      }
    }

    this.geoJsonFeatureTap.emit(nearest ? geoJsonPointLatLon(nearest) : null);
  }

  private updateArrow(): void {
    this.clearArrow();
    if (!this.arrowTarget || !this.center) return;

    const from = L.latLng(this.center.lat, this.center.lon);
    const to   = L.latLng(this.arrowTarget.lat, this.arrowTarget.lon);
    const bearing = bearingDecimal(this.center, this.arrowTarget);
    const distM   = haversineMeters(this.center, this.arrowTarget);

    this.arrowPolyline = L.polyline([from, to], {
      color: '#cc0000', weight: 2.5, dashArray: '6 4',
      interactive: false, className: 'arrow-line',
    }).addTo(this.map);

    this.arrowHeadMarker = L.marker(to, {
      icon: L.divIcon({
        html: `<div class="arrow-head" style="transform:rotate(${bearing}deg)">&#9658;</div>`,
        className: '',
        iconSize:   [20, 20],
        iconAnchor: [10, 10],
      }),
      interactive: false,
    }).addTo(this.map);

    const mid: L.LatLngExpression = [
      (this.center.lat  + this.arrowTarget.lat) / 2,
      (this.center.lon  + this.arrowTarget.lon) / 2,
    ];
    const mode  = arrowLabelMode(this.map.getZoom());
    const label = formatArrowLabel(distM, bearing, mode);

    this.arrowTooltip = L.tooltip({
      permanent: true, direction: 'center',
      className: 'map-arrow-label', interactive: false,
    }).setLatLng(mid).setContent(label || '&nbsp;');

    if (mode !== 'none') this.arrowTooltip.addTo(this.map);
  }

  private refreshArrowLabel(): void {
    if (!this.arrowTarget || !this.center || !this.arrowTooltip) return;
    const distM   = haversineMeters(this.center, this.arrowTarget);
    const bearing = bearingDecimal(this.center, this.arrowTarget);
    const mode    = arrowLabelMode(this.map.getZoom());
    const label   = formatArrowLabel(distM, bearing, mode);

    if (mode === 'none') {
      this.arrowTooltip.remove();
    } else {
      this.arrowTooltip.setContent(label);
      if (!this.map.hasLayer(this.arrowTooltip)) this.arrowTooltip.addTo(this.map);
    }
  }

  private clearArrow(): void {
    this.arrowPolyline?.remove();
    this.arrowHeadMarker?.remove();
    this.arrowTooltip?.remove();
    this.arrowPolyline    = undefined;
    this.arrowHeadMarker  = undefined;
    this.arrowTooltip     = undefined;
  }

  // ── API pública ──────────────────────────────────────────────────────────

  centerOnUser(): void {
    if (!this.center) return;
    this.map.flyTo(
      [this.center.lat, this.center.lon],
      Math.max(this.map.getZoom(), 14),
      { duration: 0.7, easeLinearity: 0.4 },
    );
  }

  flyTo(pos: LatLon, zoom = 10): void {
    this.map?.flyTo([pos.lat, pos.lon], zoom);
  }

  invalidate(): void {
    clearTimeout(this.invalidateTimer);
    this.invalidateTimer = setTimeout(() => this.map?.invalidateSize(), 100);
  }
}
