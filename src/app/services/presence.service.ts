import { Injectable, signal } from '@angular/core';
import { connect, StringCodec } from 'nats.ws';
import type { NatsConnection, KV } from 'nats.ws';
import { PeerMarker, PeerPosition } from '../models/presence.model';

const BUCKET      = 'MH_POSITIONS';
const PUBLISH_MS  = 15_000;
const STALE_MS    = 5 * 60_000;
const sc          = StringCodec();

@Injectable({ providedIn: 'root' })
export class PresenceService {
  readonly peers    = signal<PeerMarker[]>([]);
  readonly online   = signal(false);
  readonly sharing  = signal(false);

  private nc?:       NatsConnection;
  private kv?:       KV;
  private timer?:    ReturnType<typeof setInterval>;
  private watcher?:  AsyncIterable<any>;
  private ownCall?:  string;

  async connect(natsWsUrl: string): Promise<void> {
    if (this.nc) return;
    try {
      this.nc = await connect({ servers: natsWsUrl });
      this.online.set(true);
      const js  = this.nc.jetstream();
      this.kv   = await js.views.kv(BUCKET, { ttl: STALE_MS });
      void this.startWatching();
    } catch (e) {
      console.warn('[PresenceService] connect error:', e);
      this.online.set(false);
    }
  }

  async startSharing(callsign: string, getPosition: () => PeerPosition | null): Promise<void> {
    if (!this.kv || this.sharing()) return;
    this.ownCall = callsign;
    this.sharing.set(true);

    const publish = async () => {
      const pos = getPosition();
      if (!pos || !this.kv) return;
      try {
        await this.kv.put(callsign, sc.encode(JSON.stringify(pos)));
      } catch { /* red no disponible — se reintenta en el siguiente tick */ }
    };

    await publish();
    this.timer = setInterval(publish, PUBLISH_MS);
  }

  async stopSharing(): Promise<void> {
    this.sharing.set(false);
    clearInterval(this.timer);
    this.timer = undefined;
    if (this.kv && this.ownCall) {
      try { await this.kv.delete(this.ownCall); } catch { /* ignore */ }
    }
    this.ownCall = undefined;
  }

  async disconnect(): Promise<void> {
    await this.stopSharing();
    try { await this.nc?.drain(); } catch { /* ignore */ }
    this.nc = undefined;
    this.kv = undefined;
    this.online.set(false);
    this.peers.set([]);
  }

  private async startWatching(): Promise<void> {
    if (!this.kv) return;
    try {
      const watcher = await this.kv.watch();
      for await (const entry of watcher) {
        if (!this.nc) break;
        if (entry.operation === 'DEL' || entry.operation === 'PURGE') {
          this.removePeer(entry.key);
        } else {
          try {
            const pos: PeerPosition = JSON.parse(sc.decode(entry.value));
            if (pos.call !== this.ownCall) this.upsertPeer(pos);
          } catch { /* entrada malformada — ignorar */ }
        }
      }
    } catch { /* watcher cerrado al desconectar */ }
  }

  private upsertPeer(pos: PeerPosition): void {
    const marker: PeerMarker = {
      callsign: pos.call,
      pos:      { lat: pos.lat, lon: pos.lon },
      grid:     pos.grid,
      ts:       pos.ts,
      stale:    Date.now() - pos.ts > STALE_MS,
    };
    this.peers.update(list => {
      const idx = list.findIndex(p => p.callsign === pos.call);
      return idx >= 0
        ? list.map((p, i) => i === idx ? marker : p)
        : [...list, marker];
    });
  }

  private removePeer(callsign: string): void {
    this.peers.update(list => list.filter(p => p.callsign !== callsign));
  }
}
