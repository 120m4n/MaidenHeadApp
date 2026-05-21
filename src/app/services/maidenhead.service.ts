import { Injectable } from '@angular/core';
import {
  latLonToMaidenhead,
  maidenheadToBoundingBox,
  validateGridLocator,
} from '@mr_uu/maidenhead-grid';
import { GridBounds, LatLon } from '../models/position.model';

export type GridPrecision = 4 | 6 | 8;

@Injectable({ providedIn: 'root' })
export class MaidenheadService {

  /** lat/lon → QTH Locator (Maidenhead) en mayúsculas */
  toGrid(lat: number, lon: number, precision: GridPrecision = 6): string {
    const grid = latLonToMaidenhead({ lat, lon }, precision);
    return grid ? grid.toUpperCase() : '';
  }

  /** QTH Locator → bounding box {sw, ne} para dibujar en Leaflet */
  toBounds(grid: string): GridBounds | null {
    if (!this.isValid(grid)) return null;
    const bbox = maidenheadToBoundingBox(grid.toUpperCase());
    if (!bbox) return null;
    return {
      sw: { lat: bbox.sw.lat, lon: bbox.sw.lon },
      ne: { lat: bbox.ne.lat, lon: bbox.ne.lon },
    };
  }

  /** Centro aproximado del grid */
  toCenter(grid: string): LatLon | null {
    const bounds = this.toBounds(grid);
    if (!bounds) return null;
    return {
      lat: (bounds.sw.lat + bounds.ne.lat) / 2,
      lon: (bounds.sw.lon + bounds.ne.lon) / 2,
    };
  }

  /** Valida que sea un grid Maidenhead bien formado (4, 6 u 8 chars) */
  isValid(grid: string): boolean {
    return validateGridLocator(grid.toUpperCase());
  }

  /** Truncar a precisión menor (útil para display) */
  truncate(grid: string, precision: GridPrecision): string {
    return grid.substring(0, precision).toUpperCase();
  }
}
