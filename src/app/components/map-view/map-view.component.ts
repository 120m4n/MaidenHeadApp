import {
  Component, Input, Output, EventEmitter, OnDestroy,
  AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges,
} from '@angular/core';
import * as L from 'leaflet';
import { LatLon, GridBounds } from '../../models/position.model';

// Fix leaflet marker icons para Angular + Capacitor
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

// ── Paleta de colores fija (Leaflet no lee CSS variables en opciones JS) ──
// Los valores coinciden con los tokens dark-theme de variables.scss:
//   --ham-glow:   #34c9a0   --ham-amber: #d4923e   --ham-sky: #5ab0e8
const USER_DOT_COLOR  = '#5ab0e8';   // azul cielo  — usuario    (ham-sky dark)
const USER_DOT_BORDER = '#ffffff';
const MH_COLOR        = '#34c9a0';   // teal-cian   — Maidenhead (ham-glow dark)
const OLC_COLOR       = '#d4923e';   // ámbar cálido — Plus Code  (ham-amber dark)
const TAP_GRID_COLOR  = '#5ab0e8';   // azul cielo  — grid temporal de tap

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
      display: block;
      width:   100%;
      /* Sin height explícito: en layout normal (:host = display:block) su alto
         viene determinado por el contenido (.map-container con --map-height fijo).
         En home, al ser flex-item con flex:1, el algoritmo flexbox asigna
         la altura y percentage height en .map-container resuelve contra ella. */
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
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ── Inputs ──────────────────────────────────────────────────────────────
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

  // ── Outputs ─────────────────────────────────────────────────────────────
  @Output() mapTap       = new EventEmitter<MapTapEvent>();
  @Output() mapLongPress = new EventEmitter<MapTapEvent>();

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
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    clearTimeout(this.initTimer);
    clearTimeout(this.invalidateTimer);
    this.map?.remove();
  }

  // ── Inicialización ───────────────────────────────────────────────────────

  private initMap(): void {
    const el = this.mapContainer.nativeElement;
    // NOTA: NO se fuerza height inline — el tamaño viene del CSS (flex / --map-height).
    // Si el contenedor aún tiene height=0 en este momento (iOS / WKWebView), el
    // ResizeObserver llamará invalidateSize() en cuanto el layout se establezca.

    this.map = L.map(el, { zoomControl: true, attributionControl: true })
      .setView([0, 0], 2);

    this.map.zoomControl.setPosition('topright');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.addLayerToggleControl();
    this.addLocateControl();
    this.addMapEventHandlers();

    if (this.center)              this.updateUserMarker();
    if (this.gridBounds)          this.updateMhRect();
    if (this.plusBounds)          this.updateOlcRect();
    if (this.tapGridBounds)       this.updateTapRect();
    if (this.savedMarkers.length) this.updateSavedMarkers();

    this.initTimer = setTimeout(() => this.map.invalidateSize(), 200);
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
          mh:   self.makeLayerBtn(wrap, 'mh',   MH_COLOR,  'MH'),
          olc:  self.makeLayerBtn(wrap, 'olc',  OLC_COLOR, 'OLC'),
          both: self.makeLayerBtn(wrap, 'both', '',        'ALL'),
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
    color: string,
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
      d1.style.background = MH_COLOR;
      const d2 = document.createElement('span');
      d2.className = 'mlc-dot';
      d2.style.background = OLC_COLOR;
      btn.appendChild(d1);
      btn.appendChild(d2);
    } else {
      const dot = document.createElement('span');
      dot.className = 'mlc-dot';
      dot.style.background = color;
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

    new LocateControl({ position: 'bottomright' }).addTo(this.map);
  }

  // ── Handlers del mapa ────────────────────────────────────────────────────

  private addMapEventHandlers(): void {
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapTap.emit({ lat: e.latlng.lat, lon: e.latlng.lng });
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
          radius: acc, fillColor: USER_DOT_COLOR, fillOpacity: 0.08,
          color: USER_DOT_COLOR, weight: 1.5, dashArray: '5 5',
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
        radius: 9, fillColor: USER_DOT_COLOR, fillOpacity: 1,
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
        color: MH_COLOR, weight: 1.5,
        fillColor: MH_COLOR, fillOpacity: 0.09,
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
        color: OLC_COLOR, weight: 1.5,
        fillColor: OLC_COLOR, fillOpacity: 0.12,
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
        color:       TAP_GRID_COLOR,
        weight:      2,
        fillColor:   TAP_GRID_COLOR,
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
