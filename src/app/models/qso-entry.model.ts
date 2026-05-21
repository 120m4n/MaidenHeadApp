export type QsoMode = 'SSB' | 'CW' | 'FT8' | 'FT4' | 'AM' | 'FM' | 'DIGI' | 'OTHER';
export type QsoBand = '160M' | '80M' | '40M' | '30M' | '20M' | '17M' | '15M' | '12M' | '10M'
  | '6M' | '4M' | '2M' | '70CM' | '23CM' | 'OTHER';

export interface QsoEntry {
  id: string;
  /** UTC date YYYYMMDD */
  qsoDate: string;
  /** UTC time HHMMSS */
  timeOn: string;
  /** Callsign del corresponsal */
  call: string;
  band: QsoBand;
  mode: QsoMode;
  rstSent: string;   // e.g. "59"
  rstRcvd: string;
  /** Grid del corresponsal (opcional) */
  dxGrid: string;
  /** Grid propio al momento del QSO */
  myGrid: string;
  myPlusCode: string;
  /** Indicativo propio (station callsign) al momento del QSO */
  stationCallsign?: string;
  /** Distancia calculada en km */
  distanceKm?: number;
  comment?: string;
}

export const DEFAULT_RST: Record<QsoMode, string> = {
  SSB: '59', CW: '599', FT8: '-10', FT4: '-10',
  AM: '59', FM: '59', DIGI: '59', OTHER: '59',
};
