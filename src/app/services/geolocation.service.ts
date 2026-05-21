import { Injectable, inject, signal } from '@angular/core';
import { Geolocation, PermissionStatus, WatchPositionCallback } from '@capacitor/geolocation';
import { MaidenheadService } from './maidenhead.service';
import { PluscodeService } from './pluscode.service';
import { SettingsService } from './settings.service';
import { Position } from '../models/position.model';

export type GeoStatus = 'idle' | 'watching' | 'error' | 'denied';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private maidenhead = inject(MaidenheadService);
  private pluscode = inject(PluscodeService);
  private settings = inject(SettingsService);

  readonly position = signal<Position | null>(null);
  readonly status = signal<GeoStatus>('idle');
  readonly error = signal<string | null>(null);

  private watchId: string | null = null;

  /** Inicia el watch continuo de posición */
  async startWatch(): Promise<void> {
    const perms = await this.requestPermission();
    if (!perms) return;

    this.status.set('watching');

    const cb: WatchPositionCallback = (pos, err) => {
      if (err || !pos) {
        this.error.set(err?.message ?? 'Error de GPS');
        this.status.set('error');
        return;
      }
      const { latitude: lat, longitude: lon, accuracy, altitude } = pos.coords;
      const precision = this.settings.gridPrecision();

      this.position.set({
        lat,
        lon,
        accuracy: accuracy ?? 0,
        altitude: altitude ?? null,
        grid4: this.maidenhead.toGrid(lat, lon, 4),
        grid6: this.maidenhead.toGrid(lat, lon, 6),
        grid8: this.maidenhead.toGrid(lat, lon, 8),
        plusCode: this.pluscode.encode(lat, lon),
        ts: Date.now(),
      });
      this.error.set(null);
    };

    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000 },
      cb,
    );
  }

  /** Obtiene posición única (sin watch continuo) */
  async getCurrent(): Promise<Position | null> {
    const perms = await this.requestPermission();
    if (!perms) return null;

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude: lat, longitude: lon, accuracy, altitude } = pos.coords;
      const p: Position = {
        lat, lon,
        accuracy: accuracy ?? 0,
        altitude: altitude ?? null,
        grid4: this.maidenhead.toGrid(lat, lon, 4),
        grid6: this.maidenhead.toGrid(lat, lon, 6),
        grid8: this.maidenhead.toGrid(lat, lon, 8),
        plusCode: this.pluscode.encode(lat, lon),
        ts: Date.now(),
      };
      this.position.set(p);
      return p;
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error de GPS');
      return null;
    }
  }

  stopWatch(): void {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
      this.status.set('idle');
    }
  }

  private async requestPermission(): Promise<boolean> {
    try {
      let perms: PermissionStatus = await Geolocation.checkPermissions();
      if (perms.location === 'prompt' || perms.location === 'prompt-with-rationale') {
        perms = await Geolocation.requestPermissions();
      }
      if (perms.location === 'denied') {
        this.status.set('denied');
        this.error.set('Permiso de ubicación denegado. Actívalo en Ajustes.');
        return false;
      }
      return true;
    } catch {
      // Browser: no Capacitor native, usamos web API como fallback
      return true;
    }
  }
}
