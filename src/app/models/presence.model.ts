import { LatLon } from './position.model';

export interface PeerPosition {
  v:    1;
  call: string;
  lat:  number;
  lon:  number;
  grid: string;
  acc:  number;
  ts:   number;
}

export interface PeerMarker {
  callsign: string;
  pos:      LatLon;
  grid:     string;
  ts:       number;
  stale:    boolean;
}
