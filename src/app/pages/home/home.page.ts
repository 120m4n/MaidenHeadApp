import {
  Component, OnInit, OnDestroy, ViewChild, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonIcon, IonToast, ModalController, IonFab, IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline, addOutline } from 'ionicons/icons';

import { GeolocationService } from '../../services/geolocation.service';
import { MaidenheadService } from '../../services/maidenhead.service';
import { PluscodeService } from '../../services/pluscode.service';
import { SettingsService } from '../../services/settings.service';
import { QsoLogService } from '../../services/qso-log.service';
import { BearingService } from '../../services/bearing.service';
import { LatLon, GridBounds } from '../../models/position.model';
import { MapViewComponent, MapTapEvent } from '../../components/map-view/map-view.component';
import { PositionCardComponent } from '../../components/position-card/position-card.component';
import { QsoFormModalComponent } from '../../components/qso-form-modal/qso-form-modal.component';

interface SavedPin {
  pos: LatLon;
  label: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonIcon, IonToast, IonFab, IonFabButton,
    MapViewComponent, PositionCardComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild(MapViewComponent) mapView?: MapViewComponent;

  geo = inject(GeolocationService);
  private maidenhead = inject(MaidenheadService);
  private pluscode   = inject(PluscodeService);
  private settings   = inject(SettingsService);
  private qsoLog     = inject(QsoLogService);
  private bearingService = inject(BearingService);
  private modalCtrl  = inject(ModalController);

  savedPins = signal<SavedPin[]>([]);
  toastMsg  = signal('');
  showToast = signal(false);

  /** Grid temporal azul que aparece al tocar el mapa */
  readonly tapGridBounds = signal<GridBounds | null>(null);
  readonly tapGridLabel  = signal<string>('');

  // ── Computed map inputs ───────────────────────────────────────────────────
  // IMPORTANTE: computed() memoiza por referencia — se re-ejecutan solo cuando
  // el string del grid o el plus-code cambian (cruce de cuadrícula), NO en cada
  // tick GPS. Esto evita que ngOnChanges de MapViewComponent destruya y recree
  // las capas Leaflet en cada actualización de posición.

  /** Posición central para el marcador (objeto estable entre ticks) */
  readonly center = computed((): LatLon | null => {
    const pos = this.geo.position();
    return pos ? { lat: pos.lat, lon: pos.lon } : null;
  });

  /** Precisión GPS (primitivo — memoizado por ===) */
  readonly accuracy = computed(() => this.geo.position()?.accuracy ?? null);

  // String intermedio del grid (primitivo → equality === evita re-runs innecesarios)
  private readonly _gridStr = computed((): string => {
    const pos = this.geo.position();
    if (!pos) return '';
    const p = this.settings.gridPrecision();
    return p === 4 ? pos.grid4 : p === 8 ? pos.grid8 : pos.grid6;
  });

  /** Label Maidenhead (ej: "FN20XR") */
  readonly gridLabel = computed(() => this._gridStr());

  /** Maidenhead bounds — solo se recalcula al cruzar cuadrícula */
  readonly gridBounds = computed((): GridBounds | null => {
    const grid = this._gridStr();
    return grid ? this.maidenhead.toBounds(grid) : null;
  });

  // String intermedio del Plus Code (primitivo)
  private readonly _plusStr = computed(() => this.geo.position()?.plusCode ?? '');

  /** Label Plus Code (ej: "87G7PX7V+4H") */
  readonly plusLabel = computed(() => this._plusStr());

  /** Plus Code bounds — solo se recalcula cuando cambia el plus-code */
  readonly plusBounds = computed((): GridBounds | null => {
    const pc = this._plusStr();
    if (!pc) return null;
    const dec = this.pluscode.decode(pc);
    return dec ? { sw: dec.sw, ne: dec.ne } : null;
  });

  constructor() {
    addIcons({ refreshOutline, addOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.geo.startWatch();
  }

  ngOnDestroy(): void {
    this.geo.stopWatch();
  }

  async refresh(): Promise<void> {
    await this.geo.getCurrent();
    this.mapView?.invalidate();
  }

  /** Tap en mapa → dibuja grid azul temporal + muestra toast */
  onMapTap(evt: MapTapEvent): void {
    const grid   = this.maidenhead.toGrid(evt.lat, evt.lon, this.settings.gridPrecision());
    const bounds = this.maidenhead.toBounds(grid);
    // Muestra el rectángulo azul; se borra en onToastDismiss (mismo instante que el toast)
    this.tapGridBounds.set(bounds);
    this.tapGridLabel.set(grid);
    this.toast(`Grid: ${grid} (${evt.lat.toFixed(4)}, ${evt.lon.toFixed(4)})`);
  }

  /** Cierra el toast Y borra el grid de tap al mismo tiempo */
  onToastDismiss(): void {
    this.showToast.set(false);
    this.tapGridBounds.set(null);
    this.tapGridLabel.set('');
  }

  /** Long-press → guarda pin permanente */
  onMapLongPress(evt: MapTapEvent): void {
    const grid = this.maidenhead.toGrid(evt.lat, evt.lon, this.settings.gridPrecision());
    const pin: SavedPin = { pos: { lat: evt.lat, lon: evt.lon }, label: grid };
    this.savedPins.update(pins => [...pins, pin]);
    this.toast(`Pin guardado: ${grid}`);
  }

  /** FAB → abre modal para nuevo QSO desde posición actual */
  async newQso(): Promise<void> {
    const pos = this.geo.position();
    const modal = await this.modalCtrl.create({
      component: QsoFormModalComponent,
      componentProps: {
        myGrid: pos?.grid6 ?? '',
        myPlusCode: pos?.plusCode ?? '',
      },
    });
    modal.onDidDismiss().then(async (result) => {
      const data = result?.data;
      if (data) await this.qsoLog.add(data);
    });
    await modal.present();
  }

  private toast(msg: string): void {
    this.toastMsg.set(msg);
    this.showToast.set(true);
  }
}
