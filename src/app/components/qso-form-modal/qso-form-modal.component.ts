import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect,
  IonSelectOption, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { QsoEntry, QsoMode, QsoBand, DEFAULT_RST } from '../../models/qso-entry.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-qso-form-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Nuevo QSO</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel.emit()" aria-label="Cancelar">
            <ion-icon slot="icon-only" name="close-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>

        <ion-item>
          <ion-label position="stacked">Indicativo corresponsal *</ion-label>
          <ion-input
            [(ngModel)]="form().call"
            (ngModelChange)="updateForm('call', $event)"
            placeholder="EG. W1ABC"
            [style.text-transform]="'uppercase'"
            autocapitalize="characters"
            autocorrect="off"
            inputmode="text" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Banda *</ion-label>
          <ion-select [(ngModel)]="form().band" (ngModelChange)="updateForm('band', $event)">
            @for (b of bands; track b) {
              <ion-select-option [value]="b">{{ b }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Modo *</ion-label>
          <ion-select [(ngModel)]="form().mode" (ngModelChange)="onModeChange($event)">
            @for (m of modes; track m) {
              <ion-select-option [value]="m">{{ m }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">RST Enviado</ion-label>
          <ion-input [(ngModel)]="form().rstSent" (ngModelChange)="updateForm('rstSent', $event)"
                     placeholder="59" inputmode="numeric" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">RST Recibido</ion-label>
          <ion-input [(ngModel)]="form().rstRcvd" (ngModelChange)="updateForm('rstRcvd', $event)"
                     placeholder="59" inputmode="numeric" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Grid del corresponsal (opcional)</ion-label>
          <ion-input [(ngModel)]="form().dxGrid" (ngModelChange)="updateForm('dxGrid', $event)"
                     placeholder="FN20" autocapitalize="characters"
                     [style.text-transform]="'uppercase'" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Nota / Comentario</ion-label>
          <ion-input [(ngModel)]="form().comment" (ngModelChange)="updateForm('comment', $event)"
                     placeholder="Campo libre" />
        </ion-item>

      </ion-list>

      <div class="btn-row">
        <ion-button expand="block" color="primary" class="cta-large"
                    [disabled]="!isValid()"
                    (click)="save()">
          <ion-icon slot="start" name="save-outline" />
          Guardar QSO
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .btn-row { padding: 16px; }
    ion-input[style*="uppercase"] { text-transform: uppercase; }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect,
    IonSelectOption, IonIcon,
  ],
})
export class QsoFormModalComponent {
  @Input() myGrid = '';
  @Input() myPlusCode = '';
  @Input() prefillDxGrid = '';
  @Output() saved = new EventEmitter<Omit<QsoEntry, 'id'>>();
  @Output() cancel = new EventEmitter<void>();

  private settings = inject(SettingsService);

  bands: QsoBand[] = ['160M','80M','40M','30M','20M','17M','15M','12M','10M','6M','4M','2M','70CM','23CM','OTHER'];
  modes: QsoMode[] = ['SSB','CW','FT8','FT4','AM','FM','DIGI','OTHER'];

  form = signal<Partial<QsoEntry>>({
    call: '',
    band: '20M',
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    dxGrid: '',
    comment: '',
  });

  constructor() {
    addIcons({ closeOutline, saveOutline });
    // Pre-rellenar callsign del settings
    const cs = this.settings.callsign();
    if (cs) this.updateForm('myGrid', cs);
    if (this.prefillDxGrid) this.updateForm('dxGrid', this.prefillDxGrid);
  }

  updateForm(key: keyof QsoEntry, value: any): void {
    this.form.update(f => ({ ...f, [key]: typeof value === 'string' ? value.toUpperCase() : value }));
  }

  onModeChange(mode: QsoMode): void {
    this.form.update(f => ({
      ...f, mode,
      rstSent: DEFAULT_RST[mode],
      rstRcvd: DEFAULT_RST[mode],
    }));
  }

  isValid(): boolean {
    const f = this.form();
    return !!(f.call?.trim() && f.band && f.mode);
  }

  save(): void {
    if (!this.isValid()) return;
    const now = new Date();
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    const f = this.form();
    this.saved.emit({
      call: (f.call ?? '').toUpperCase().trim(),
      qsoDate: `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}`,
      timeOn: `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`,
      band: f.band as QsoBand,
      mode: f.mode as QsoMode,
      rstSent: f.rstSent ?? DEFAULT_RST[f.mode as QsoMode],
      rstRcvd: f.rstRcvd ?? DEFAULT_RST[f.mode as QsoMode],
      dxGrid: (f.dxGrid ?? '').toUpperCase(),
      myGrid: this.myGrid,
      myPlusCode: this.myPlusCode,
      comment: f.comment,
    });
  }
}
