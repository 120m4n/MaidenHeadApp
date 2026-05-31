import { Injectable, signal, computed } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { GridPrecision } from './maidenhead.service';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type DistanceUnit = 'km' | 'nm';

export interface AppSettings {
  callsign: string;
  gridPrecision: GridPrecision;
  themeMode: ThemeMode;
  distanceUnit: DistanceUnit;
  locationSharing: boolean;
  natsUrl: string;
}

const DEFAULTS: AppSettings = {
  callsign: '',
  gridPrecision: 6,
  themeMode: 'auto',
  distanceUnit: 'km',
  locationSharing: false,
  natsUrl: 'auto',   // 'auto' → ws://<same-host>/nats-ws (nginx gateway)
};

const KEY = 'app_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _settings = signal<AppSettings>({ ...DEFAULTS });

  readonly settings = this._settings.asReadonly();
  readonly callsign        = computed(() => this._settings().callsign);
  readonly gridPrecision   = computed(() => this._settings().gridPrecision);
  readonly themeMode       = computed(() => this._settings().themeMode);
  readonly distanceUnit    = computed(() => this._settings().distanceUnit);
  readonly locationSharing = computed(() => this._settings().locationSharing);
  readonly natsUrl         = computed(() => this._settings().natsUrl);

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      try {
        this._settings.set({ ...DEFAULTS, ...JSON.parse(value) });
      } catch { /* usa defaults */ }
    }
  }

  async update(partial: Partial<AppSettings>): Promise<void> {
    const next = { ...this._settings(), ...partial };
    this._settings.set(next);
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  }
}
