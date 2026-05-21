// Type declarations for libraries without bundled .d.ts files

declare module '@mr_uu/maidenhead-grid' {
  export interface LatLonCoord { lat: number; lon: number; }
  export interface BoundingBox { sw: LatLonCoord; ne: LatLonCoord; }

  export function latLonToMaidenhead(coord: LatLonCoord, length: number): string;
  export function maidenheadToBoundingBox(grid: string): BoundingBox;
  export function maidenheadToLatLon(grid: string): LatLonCoord;
  export function validateGridLocator(grid: string): boolean;
}

declare module 'open-location-code' {
  interface OlcArea {
    latitudeCenter: number;
    longitudeCenter: number;
    latitudeLo: number;
    latitudeHi: number;
    longitudeLo: number;
    longitudeHi: number;
  }
  export class OpenLocationCode {
    encode(lat: number, lon: number, length?: number): string;
    decode(code: string): OlcArea;
    isValid(code: string): boolean;
    isFull(code: string): boolean;
    isShort(code: string): boolean;
  }
}
