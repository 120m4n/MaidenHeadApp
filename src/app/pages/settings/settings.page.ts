import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle,
  IonContent, IonInput, IonSelect, IonSelectOption, IonIcon, IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  radioOutline, locationOutline, contrastOutline,
  informationCircleOutline, mapOutline, logoGithub, codeSlashOutline,
  bookOutline,
} from 'ionicons/icons';
import { HamRefModalComponent } from '../../components/ham-ref-modal/ham-ref-modal.component';

import { SettingsService, ThemeMode, DistanceUnit } from '../../services/settings.service';
import { ThemeService } from '../../services/theme.service';
import { GridPrecision } from '../../services/maidenhead.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle,
    IonContent, IonInput, IonSelect, IonSelectOption, IonIcon, IonButton,
  ],
})
export class SettingsPage implements OnInit {
  private settingsService = inject(SettingsService);
  private themeService    = inject(ThemeService);
  private modalCtrl       = inject(ModalController);

  constructor() {
    addIcons({ radioOutline, locationOutline, contrastOutline, informationCircleOutline, mapOutline, logoGithub, codeSlashOutline, bookOutline });
  }

  // Valores locales enlazados a ngModel
  callsign = '';
  gridPrecision: GridPrecision = 6;
  themeMode: ThemeMode = 'auto';
  distanceUnit: DistanceUnit = 'km';

  async ngOnInit(): Promise<void> {
    const s = this.settingsService.settings();
    this.callsign = s.callsign;
    this.gridPrecision = s.gridPrecision;
    this.themeMode = s.themeMode;
    this.distanceUnit = s.distanceUnit;
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

  async openRefModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HamRefModalComponent,
      cssClass:  'ham-ref-modal',
    });
    await modal.present();
  }

  get version(): string { return '1.0.0'; }

  openRepo(): void {
    window.open('https://github.com/120m4n/MaidenHeadApp', '_system');
  }
}
