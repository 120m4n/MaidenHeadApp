import { Injectable } from '@angular/core';
import { OpenLocationCode } from 'open-location-code';
import { LatLon } from '../models/position.model';

@Injectable({ providedIn: 'root' })
export class PluscodeService {
  private olc = new OpenLocationCode();

  /**
   * lat/lon → Plus Code (Open Location Code)
   * length: 8 = ~14m, 10 = ~3m (por defecto 10)
   */
  encode(lat: number, lon: number, length: number = 10): string {
    return this.olc.encode(lat, lon, length);
  }

  /** Plus Code → lat/lon central y bounds */
  decode(code: string): { center: LatLon; sw: LatLon; ne: LatLon } | null {
    try {
      const area = this.olc.decode(code);
      return {
        center: { lat: area.latitudeCenter, lon: area.longitudeCenter },
        sw: { lat: area.latitudeLo, lon: area.longitudeLo },
        ne: { lat: area.latitudeHi, lon: area.longitudeHi },
      };
    } catch {
      return null;
    }
  }

  isValid(code: string): boolean {
    return this.olc.isValid(code) && this.olc.isFull(code);
  }
}
