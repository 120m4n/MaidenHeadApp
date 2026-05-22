import {
  Component, ViewChild, inject, signal, computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle,
  IonContent, IonInput, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonToast, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, addCircleOutline } from 'ionicons/icons';

import { MaidenheadService } from '../../services/maidenhead.service';
import { PluscodeService } from '../../services/pluscode.service';
import { BearingService, BearingResult } from '../../services/bearing.service';
import { GeolocationService } from '../../services/geolocation.service';
import { SettingsService } from '../../services/settings.service';
import { QsoLogService } from '../../services/qso-log.service';
import { LatLon, GridBounds } from '../../models/position.model';
import { MapViewComponent, MapTapEvent } from '../../components/map-view/map-view.component';
import { BearingIndicatorComponent } from '../../components/bearing-indicator/bearing-indicator.component';
import { CopyButtonComponent } from '../../components/copy-button/copy-button.component';
import { QsoFormModalComponent } from '../../components/qso-form-modal/qso-form-modal.component';

type InputMode = 'grid' | 'plus';

@Component({
  selector: 'app-grid-lookup',
  templateUrl: 'grid-lookup.page.html',
  styleUrls: ['grid-lookup.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle,
    IonContent, IonInput, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonToast,
    MapViewComponent, BearingIndicatorComponent, CopyButtonComponent,
  ],
})
export class GridLookupPage {
  @ViewChild(MapViewComponent) mapView?: MapViewComponent;

  private maidenhead = inject(MaidenheadService);
  private pluscode = inject(PluscodeService);
  private bearing = inject(BearingService);
  private geo = inject(GeolocationService);
  private settings = inject(SettingsService);
  private qsoLog = inject(QsoLogService);
  private modalCtrl = inject(ModalController);

  inputMode = signal<InputMode>('grid');
  gridInput = signal('');
  plusInput = signal('');

  resultCenter    = signal<LatLon | null>(null);
  showResultCard  = signal(false);
  /** Bounds del grid Maidenhead del resultado */
  resultBounds    = signal<GridBounds | null>(null);
  /** Bounds del Plus Code del resultado */
  resultPlusBounds = signal<GridBounds | null>(null);
  resolvedGrid    = signal('');
  resolvedPlus    = signal('');
  bearingResult = signal<BearingResult | null>(null);
  validationError = signal('');
  toastMsg = signal('');
  showToast = signal(false);

  distanceUnit = computed(() => this.settings.distanceUnit());

  constructor() {
    addIcons({ searchOutline, addCircleOutline });
  }

  lookup(): void {
    this.validationError.set('');
    if (this.inputMode() === 'grid') {
      this.lookupGrid();
    } else {
      this.lookupPlus();
    }
  }

  private lookupGrid(): void {
    const raw = this.gridInput().trim().toUpperCase();
    if (!this.maidenhead.isValid(raw)) {
      this.validationError.set('Grid inválido. Ej: FN20, FN20XR, FN20XR45');
      return;
    }
    const bounds = this.maidenhead.toBounds(raw);
    const center = this.maidenhead.toCenter(raw);
    if (!bounds || !center) return;

    const plusCode = this.pluscode.encode(center.lat, center.lon);
    const plusDecoded = this.pluscode.decode(plusCode);

    this.resultBounds.set(bounds);
    this.resultPlusBounds.set(plusDecoded ? { sw: plusDecoded.sw, ne: plusDecoded.ne } : null);
    this.resultCenter.set(center);
    this.showResultCard.set(true);
    this.resolvedGrid.set(raw);
    this.resolvedPlus.set(plusCode);
    this.calcBearing(center);
    this.mapView?.flyTo(center, 10);
  }

  private lookupPlus(): void {
    const raw = this.plusInput().trim();
    if (!this.pluscode.isValid(raw)) {
      this.validationError.set('Plus Code inválido. Ej: 87G7PX7V+4H');
      return;
    }
    const decoded = this.pluscode.decode(raw);
    if (!decoded) return;

    const center = decoded.center;
    const grid   = this.maidenhead.toGrid(center.lat, center.lon, this.settings.gridPrecision());

    this.resultCenter.set(center);
    this.resultBounds.set(this.maidenhead.toBounds(grid));       // Maidenhead
    this.resultPlusBounds.set({ sw: decoded.sw, ne: decoded.ne }); // Plus Code
    this.showResultCard.set(true);
    this.resolvedPlus.set(raw);
    this.resolvedGrid.set(grid);
    this.calcBearing(center);
    this.mapView?.flyTo(center, 12);
  }

  private calcBearing(target: LatLon): void {
    const myPos = this.geo.position();
    if (!myPos) { this.bearingResult.set(null); return; }
    const from: LatLon = { lat: myPos.lat, lon: myPos.lon };
    this.bearingResult.set(this.bearing.calculate(from, target));
  }

  onMapTap(evt: MapTapEvent): void {
    const grid    = this.maidenhead.toGrid(evt.lat, evt.lon, this.settings.gridPrecision());
    const plus    = this.pluscode.encode(evt.lat, evt.lon);
    const plusDec = this.pluscode.decode(plus);
    const center: LatLon = { lat: evt.lat, lon: evt.lon };

    this.resultCenter.set(center);
    this.resultBounds.set(this.maidenhead.toBounds(grid));
    this.resultPlusBounds.set(plusDec ? { sw: plusDec.sw, ne: plusDec.ne } : null);
    this.showResultCard.set(true);
    this.resolvedGrid.set(grid);
    this.resolvedPlus.set(plus);
    this.gridInput.set(grid);
    this.calcBearing(center);
    this.toast(`Grid: ${grid}`);
  }

  async saveQso(): Promise<void> {
    const pos = this.geo.position();
    const modal = await this.modalCtrl.create({
      component: QsoFormModalComponent,
      componentProps: {
        myGrid: pos?.grid6 ?? '',
        myPlusCode: pos?.plusCode ?? '',
        prefillDxGrid: this.resolvedGrid(),
      },
    });
    modal.onDidDismiss().then(async (result) => {
      const data = result?.data;
      if (data) {
        this.showResultCard.set(false);
        await this.qsoLog.add({ ...data, distanceKm: this.bearingResult()?.km });
        this.toast('QSO guardado');
      }
    });
    await modal.present();
  }

  private toast(msg: string): void {
    this.toastMsg.set(msg);
    this.showToast.set(true);
  }
}
