import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonInput, IonSelect, IonSelectOption,
  IonNote, IonListHeader,
} from '@ionic/angular/standalone';

import { SettingsService, ThemeMode, DistanceUnit } from '../../services/settings.service';
import { ThemeService } from '../../services/theme.service';
import { GridPrecision } from '../../services/maidenhead.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonInput, IonSelect, IonSelectOption,
    IonNote, IonListHeader,
  ],
})
export class SettingsPage implements OnInit {
  private settingsService = inject(SettingsService);
  private themeService = inject(ThemeService);

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

  get version(): string { return '1.0.0'; }
}
