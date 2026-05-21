import {
  Component, OnInit, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonIcon, IonSpinner, IonToast, ModalController, IonFab, IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline, addOutline } from 'ionicons/icons';

import { GeolocationService } from '../../services/geolocation.service';
import { MaidenheadService } from '../../services/maidenhead.service';
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
    IonIcon, IonSpinner, IonToast, IonFab, IonFabButton,
    MapViewComponent, PositionCardComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild(MapViewComponent) mapView?: MapViewComponent;

  geo = inject(GeolocationService);
  private maidenhead = inject(MaidenheadService);
  private settings = inject(SettingsService);
  private qsoLog = inject(QsoLogService);
  private bearingService = inject(BearingService);
  private modalCtrl = inject(ModalController);

  savedPins = signal<SavedPin[]>([]);
  toastMsg = signal('');
  showToast = signal(false);

  // Grid bounds del QTH actual para resaltar en mapa
  get gridBounds(): GridBounds | null {
    const pos = this.geo.position();
    if (!pos) return null;
    const precision = this.settings.gridPrecision();
    const grid = precision === 4 ? pos.grid4 : precision === 8 ? pos.grid8 : pos.grid6;
    return this.maidenhead.toBounds(grid);
  }

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

  /** Tap en mapa → popup con grid del punto */
  onMapTap(evt: MapTapEvent): void {
    const grid = this.maidenhead.toGrid(evt.lat, evt.lon, this.settings.gridPrecision());
    this.toast(`Grid: ${grid} (${evt.lat.toFixed(4)}, ${evt.lon.toFixed(4)})`);
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
