export interface Position {
  lat: number;
  lon: number;
  accuracy: number; // metros
  altitude: number | null;
  grid4: string;  // FN20
  grid6: string;  // FN20XR
  grid8: string;  // FN20XR45
  plusCode: string; // 87G7PX7V+4H
  ts: number; // timestamp ms
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GridBounds {
  sw: LatLon;
  ne: LatLon;
}
