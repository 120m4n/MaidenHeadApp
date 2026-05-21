import { Injectable } from '@angular/core';
import { LatLon } from '../models/position.model';

const R_KM = 6371; // radio Tierra en km
const NM_PER_KM = 0.539957; // millas náuticas por km

export interface BearingResult {
  km: number;
  nm: number;         // millas náuticas
  bearingDeg: number; // 0-360, norte = 0
  bearingCard: string; // N, NE, E, etc.
}

@Injectable({ providedIn: 'root' })
export class BearingService {

  calculate(from: LatLon, to: LatLon): BearingResult {
    const lat1 = this.toRad(from.lat);
    const lat2 = this.toRad(to.lat);
    const dLat = this.toRad(to.lat - from.lat);
    const dLon = this.toRad(to.lon - from.lon);

    // Haversine distance
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R_KM * c;

    // Initial bearing
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2)
      - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearingDeg = ((this.toDeg(Math.atan2(y, x)) + 360) % 360);

    return {
      km: Math.round(km),
      nm: Math.round(km * NM_PER_KM),
      bearingDeg: Math.round(bearingDeg),
      bearingCard: this.toCardinal(bearingDeg),
    };
  }

  private toRad(deg: number): number { return deg * Math.PI / 180; }
  private toDeg(rad: number): number { return rad * 180 / Math.PI; }

  private toCardinal(deg: number): string {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                  'S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }
}
