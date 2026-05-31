import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle,
  IonContent, IonInput, IonSelect, IonSelectOption, IonIcon, IonButton,
  IonToggle, ModalController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  radioOutline, locationOutline, contrastOutline,
  informationCircleOutline, mapOutline, logoGithub, codeSlashOutline,
  bookOutline, wifiOutline,
} from 'ionicons/icons';
import { HamRefModalComponent } from '../../components/ham-ref-modal/ham-ref-modal.component';

import { SettingsService, ThemeMode, DistanceUnit } from '../../services/settings.service';
import { ThemeService } from '../../services/theme.service';
import { GridPrecision } from '../../services/maidenhead.service';
import packageJson from '../../../../package.json';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle,
    IonContent, IonInput, IonSelect, IonSelectOption, IonIcon, IonButton,
    IonToggle,
  ],
})
export class SettingsPage implements OnInit {
  private settingsService = inject(SettingsService);
  private themeService    = inject(ThemeService);
  private modalCtrl       = inject(ModalController);
  private alertCtrl       = inject(AlertController);

  constructor() {
    addIcons({ radioOutline, locationOutline, contrastOutline, informationCircleOutline, mapOutline, logoGithub, codeSlashOutline, bookOutline, wifiOutline });
  }

  // Valores locales enlazados a ngModel
  callsign        = '';
  gridPrecision: GridPrecision = 6;
  themeMode: ThemeMode = 'auto';
  distanceUnit: DistanceUnit = 'km';
  locationSharing = false;
  natsUrl         = 'auto';

  async ngOnInit(): Promise<void> {
    const s = this.settingsService.settings();
    this.callsign        = s.callsign;
    this.gridPrecision   = s.gridPrecision;
    this.themeMode       = s.themeMode;
    this.distanceUnit    = s.distanceUnit;
    this.locationSharing = s.locationSharing;
    this.natsUrl         = s.natsUrl;
  }

  async onCallsignChange(value: string): Promise<void> {
    await this.settingsService.update({ callsign: value.toUpperCase().trim() });
  }

  async onPrecisionChange(value: GridPrecision): Promise<void> {
    await this.settingsService.update({ gridPrecision: value });
  }

  async onThemeChange(value: ThemeMode): Promise<void> {
    await this.settingsService.update({ themeMode: value });
  }

  async onDistanceChange(value: DistanceUnit): Promise<void> {
    await this.settingsService.update({ distanceUnit: value });
  }

  async onNatsUrlChange(value: string): Promise<void> {
    const trimmed = value.trim() || 'auto';
    this.natsUrl = trimmed;
    await this.settingsService.update({ natsUrl: trimmed });
  }

  async onLocationSharingChange(newValue: boolean): Promise<void> {
    // Snap toggle de vuelta al estado actual mientras se muestra la confirmación
    this.locationSharing = !newValue;

    if (newValue && !this.callsign.trim()) {
      const alert = await this.alertCtrl.create({
        header:  'Indicativo requerido',
        message: 'Configura tu <strong>CALLSIGN</strong> antes de activar la publicación de ubicación.',
        buttons: ['Entendido'],
        cssClass: 'ham-alert',
      });
      await alert.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header:  newValue ? 'Activar publicación' : 'Desactivar publicación',
      message: newValue
        ? `Tu posición GPS será visible en la red como <strong>${this.callsign}</strong>.`
        : '¿Confirmas que deseas dejar de publicar tu ubicación en la red?',
      buttons: [
        { text: 'Cancelar',                          role: 'cancel'  },
        { text: newValue ? 'Activar' : 'Desactivar', role: 'confirm' },
      ],
      cssClass: 'ham-alert',
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role === 'confirm') {
      this.locationSharing = newValue;
      await this.settingsService.update({ locationSharing: newValue });
    }
  }

  async openRefModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HamRefModalComponent,
      cssClass:  'ham-ref-modal',
    });
    await modal.present();
  }

  get version(): string { return packageJson.version; }

  openRepo(): void {
    window.open('https://github.com/120m4n/MaidenHeadApp', '_system');
  }
}
