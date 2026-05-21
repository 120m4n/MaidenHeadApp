import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { QsoEntry } from '../models/qso-entry.model';

const STORAGE_KEY = 'qso_log';

@Injectable({ providedIn: 'root' })
export class QsoLogService {
  private _entries = signal<QsoEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      try { this._entries.set(JSON.parse(value)); } catch { /* empty log */ }
    }
  }

  async add(entry: Omit<QsoEntry, 'id'>): Promise<void> {
    const newEntry: QsoEntry = { ...entry, id: crypto.randomUUID() };
    const next = [newEntry, ...this._entries()];
    this._entries.set(next);
    await this.persist(next);
  }

  async remove(id: string): Promise<void> {
    const next = this._entries().filter(e => e.id !== id);
    this._entries.set(next);
    await this.persist(next);
  }

  async clear(): Promise<void> {
    this._entries.set([]);
    await Preferences.remove({ key: STORAGE_KEY });
  }

  /** Genera contenido ADIF v3 y abre Share sheet */
  async exportAdif(): Promise<void> {
    const content = this.buildAdif(this._entries());
    const filename = `qso_log_${this.dateTag()}.adi`;

    try {
      // Escribir al filesystem del dispositivo (Documents)
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      const uri = await Filesystem.getUri({ path: filename, directory: Directory.Documents });
      await Share.share({
        title: 'Exportar QSO Log (ADIF)',
        text: `${this._entries().length} QSOs — MaidenHeadApp`,
        url: uri.uri,
        dialogTitle: 'Compartir log ADIF',
      });
    } catch {
      // Fallback: compartir como texto plano
      await Share.share({
        title: 'Exportar QSO Log (ADIF)',
        text: content,
        dialogTitle: 'Compartir log ADIF',
      });
    }
  }

  // ─── ADIF builder ──────────────────────────────────────────────────────────

  private buildAdif(entries: QsoEntry[]): string {
    const now = new Date();
    const ts = `${this.dateTag(now)} ${String(now.getUTCHours()).padStart(2,'0')}${String(now.getUTCMinutes()).padStart(2,'0')}${String(now.getUTCSeconds()).padStart(2,'0')}`;
    const header = [
      this.field('adif_ver', '3.1.0'),
      this.field('created_timestamp', ts),
      this.field('programid', 'MaidenHeadApp'),
      this.field('programversion', '1.0'),
      '<eoh>\n',
    ].join('\n');

    const records = entries.map(e => this.buildRecord(e)).join('\n');
    return header + records;
  }

  private buildRecord(e: QsoEntry): string {
    const fields: string[] = [
      this.field('call', e.call),
      this.field('qso_date', e.qsoDate),
      this.field('time_on', e.timeOn),
      this.field('band', e.band),
      this.field('mode', e.mode),
      this.field('rst_sent', e.rstSent),
      this.field('rst_rcvd', e.rstRcvd),
      this.field('my_gridsquare', e.myGrid),
    ];
    if (e.stationCallsign) fields.push(this.field('station_callsign', e.stationCallsign));
    if (e.dxGrid) fields.push(this.field('gridsquare', e.dxGrid));
    if (e.comment) fields.push(this.field('comment', e.comment));
    fields.push('<eor>');
    return fields.join('') + '\n';
  }

  private field(name: string, value: string): string {
    return `<${name}:${value.length}>${value}`;
  }

  private dateTag(d: Date = new Date()): string {
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  }

  private async persist(entries: QsoEntry[]): Promise<void> {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(entries) });
  }
}
