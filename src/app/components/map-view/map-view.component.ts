import {
  Component, Input, Output, EventEmitter, OnDestroy,
  AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges,
} from '@angular/core';
import * as L from 'leaflet';
import { LatLon, GridBounds } from '../../models/position.model';

// Fix leaflet marker icons para Angular + Capacitor
// Las imágenes se copian a src/assets/leaflet/ en el build
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

export interface MapTapEvent {
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-map-view',
  template: `
    <div #mapContainer class="map-container"></div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .map-container {
      width: 100%;
      height: var(--map-height, 280px);
      border-radius: var(--app-card-radius);
      overflow: hidden;
    }
  `],
})
export class MapViewComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  /** Posición del marcador principal (tu QTH) */
  @Input() center: LatLon | null = null;

  /** Grid bounds a resaltar */
  @Input() gridBounds: GridBounds | null = null;

  /** Marcadores secundarios guardados */
  @Input() savedMarkers: Array<{ pos: LatLon; label: string }> = [];

  /** Emite al hacer tap/click en el mapa */
  @Output() mapTap = new EventEmitter<MapTapEvent>();

  /** Emite al hacer long-press (>600ms) */
  @Output() mapLongPress = new EventEmitter<MapTapEvent>();

  private map!: L.Map;
  private mainMarker?: L.Marker;
  private gridRect?: L.Rectangle;
  private savedLayers: L.Marker[] = [];

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['center']) this.updateMainMarker();
    if (changes['gridBounds']) this.updateGridRect();
    if (changes['savedMarkers']) this.updateSavedMarkers();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // ─── Inicialización ────────────────────────────────────────────────────────

  private initMap(): void {
    const el = this.mapContainer.nativeElement;
    // Forzar altura antes de inicializar (evita bug tiles vacíos)
    if (!el.offsetHeight) el.style.height = '280px';

    this.map = L.map(el, { zoomControl: true, attributionControl: true })
      .setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Tap handler
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapTap.emit({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    // Long-press (>600ms sin mover)
    let pressTimer: ReturnType<typeof setTimeout>;
    let pressPos: L.LatLng | null = null;
    this.map.on('mousedown touchstart', (evt: L.LeafletEvent) => {
      const e = evt as L.LeafletMouseEvent;
      pressPos = e.latlng;
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

    if (this.center) this.updateMainMarker();
    if (this.gridBounds) this.updateGridRect();
    if (this.savedMarkers.length) this.updateSavedMarkers();

    // Resize cuando el contenedor cambia (rotación, navegación)
    setTimeout(() => this.map.invalidateSize(), 200);
  }

  // ─── Actualizaciones ───────────────────────────────────────────────────────

  private updateMainMarker(): void {
    if (!this.center) return;
    const ll = L.latLng(this.center.lat, this.center.lon);
    if (this.mainMarker) {
      this.mainMarker.setLatLng(ll);
    } else {
      this.mainMarker = L.marker(ll, { title: 'Mi QTH' }).addTo(this.map);
    }
    this.map.setView(ll, this.map.getZoom() < 8 ? 10 : this.map.getZoom());
  }

  private updateGridRect(): void {
    this.gridRect?.remove();
    if (!this.gridBounds) return;
    const { sw, ne } = this.gridBounds;
    this.gridRect = L.rectangle(
      [[sw.lat, sw.lon], [ne.lat, ne.lon]],
      { color: '#4caf50', weight: 2, fillOpacity: 0.12 },
    ).addTo(this.map);
  }

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

  /** API pública: mueve el mapa a un punto sin cambiar el marcador principal */
  flyTo(pos: LatLon, zoom = 10): void {
    this.map?.flyTo([pos.lat, pos.lon], zoom);
  }

  /** Fuerza repaint (útil cuando la pestaña vuelve al foco) */
  invalidate(): void {
    setTimeout(() => this.map?.invalidateSize(), 100);
  }
}
