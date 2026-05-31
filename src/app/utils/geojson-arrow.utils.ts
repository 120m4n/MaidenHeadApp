import type * as GeoJSON from 'geojson';
import { LatLon } from '../models/position.model';

export type LabelMode = 'full' | 'dist-only' | 'none';

const R_M = 6_371_000;

const toRad = (d: number): number => (d * Math.PI) / 180;
const toDeg = (r: number): number => (r * 180) / Math.PI;

export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sin2 = (x: number) => Math.sin(x / 2) ** 2;
  const aa = sin2(dLat) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sin2(dLon);
  return R_M * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

export function bearingDecimal(from: LatLon, to: LatLon): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const deg = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(deg * 10) / 10;
}

export function geoJsonPointLatLon(feature: GeoJSON.Feature): LatLon | null {
  if (feature.geometry.type !== 'Point') return null;
  const [lon, lat] = (feature.geometry as GeoJSON.Point).coordinates;
  return { lat, lon };
}

export function arrowLabelMode(zoom: number): LabelMode {
  if (zoom >= 11) return 'full';
  if (zoom >= 8)  return 'dist-only';
  return 'none';
}

export function formatArrowLabel(distM: number, bearing: number, mode: LabelMode): string {
  if (mode === 'none') return '';
  const dist = distM < 1000
    ? `${Math.round(distM)} m`
    : `${(distM / 1000).toFixed(1)} km`;
  return mode === 'full' ? `${dist} · ${bearing.toFixed(1)}°` : dist;
}
