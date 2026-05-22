import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonInput, IonSelect,
  IonSelectOption, IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline, radioOutline, clipboardOutline } from 'ionicons/icons';
import { Clipboard } from '@capacitor/clipboard';
import { QsoEntry, QsoMode, QsoBand, DEFAULT_RST } from '../../models/qso-entry.model';
import { SettingsService } from '../../services/settings.service';
import { MaidenheadService } from '../../services/maidenhead.service';

@Component({
  selector: 'app-qso-form-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>NUEVO QSO</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismissCancel()" aria-label="Cancelar">
            <ion-icon slot="icon-only" name="close-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="qso-form">

        <!-- Callsign — hero field -->
        <div class="qso-form-hero">
          <div class="qso-form-hero__label">INDICATIVO CORRESPONSAL *</div>
          <ion-input
            [(ngModel)]="form().call"
            (ngModelChange)="updateForm('call', $event)"
            placeholder="W1ABC"
            [style.text-transform]="'uppercase'"
            autocapitalize="characters"
            autocorrect="off"
            inputmode="text"
            class="qso-form-hero__input" />
        </div>

        <div class="qso-form__divider"></div>

        <!-- Band + Mode row -->
        <div class="qso-form__row2">

          <div class="qso-form__field">
            <div class="qso-form__label">BANDA *</div>
            <ion-select [(ngModel)]="form().band" (ngModelChange)="updateForm('band', $event)"
                        class="qso-form__select">
              @for (b of bands; track b) {
                <ion-select-option [value]="b">{{ b }}</ion-select-option>
              }
            </ion-select>
          </div>

          <div class="qso-form__field">
            <div class="qso-form__label">MODO *</div>
            <ion-select [(ngModel)]="form().mode" (ngModelChange)="onModeChange($event)"
                        class="qso-form__select">
              @for (m of modes; track m) {
                <ion-select-option [value]="m">{{ m }}</ion-select-option>
              }
            </ion-select>
          </div>

        </div>

        <div class="qso-form__divider"></div>

        <!-- RST row -->
        <div class="qso-form__row2">

          <div class="qso-form__field">
            <div class="qso-form__label">RST ENVIADO</div>
            <ion-input [(ngModel)]="form().rstSent" (ngModelChange)="updateForm('rstSent', $event)"
                       placeholder="59" inputmode="numeric"
                       class="qso-form__input--small" />
          </div>

          <div class="qso-form__field">
            <div class="qso-form__label">RST RECIBIDO</div>
            <ion-input [(ngModel)]="form().rstRcvd" (ngModelChange)="updateForm('rstRcvd', $event)"
                       placeholder="59" inputmode="numeric"
                       class="qso-form__input--small" />
          </div>

        </div>

        <div class="qso-form__divider"></div>

        <!-- DX Grid -->
        <div class="qso-form__field qso-form__field--full">
          <div class="qso-form__label">GRID CORRESPONSAL (opcional)</div>
          <ion-input [(ngModel)]="form().dxGrid" (ngModelChange)="onDxGridChange($event)"
                     placeholder="FN20" autocapitalize="characters"
                     [style.text-transform]="'uppercase'"
                     clearInput="true"
                     class="qso-form__input--grid" />
          @if (fromClipboard()) {
            <div class="clipboard-badge">
              <ion-icon name="clipboard-outline" />
              <span>Desde portapapeles</span>
            </div>
          }
        </div>

        <div class="qso-form__divider"></div>

        <!-- Comment -->
        <div class="qso-form__field qso-form__field--full">
          <div class="qso-form__label">NOTA / COMENTARIO</div>
          <ion-input [(ngModel)]="form().comment" (ngModelChange)="updateForm('comment', $event)"
                     placeholder="Campo libre…"
                     class="qso-form__input--comment" />
        </div>

        <div class="qso-form__save">
          <ion-button expand="block" color="primary" class="cta-large"
                      [disabled]="!isValid()"
                      (click)="save()">
            <ion-icon slot="start" name="save-outline" />
            Guardar QSO
          </ion-button>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--ham-bg); }

    .qso-form { padding: 0 0 24px; }

    // ── Campo hero: indicativo corresponsal ────────────────────────────
    // Primer dato de un QSO — merece la máxima jerarquía visual
    .qso-form-hero {
      padding:    15px 16px 13px;
      background: var(--ham-surface);
      position:   relative;

      // Acento de señal activa — el QSO se inicia con señal recibida
      &::after {
        content:    '';
        position:   absolute;
        top:        0; left: 0; right: 0;
        height:     2px;
        background: var(--ham-glow);
        opacity:    0.55;
      }
    }

    .qso-form-hero__label {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-muted);
      margin-bottom:  7px;
    }

    // Input de indicativo — dato operativo principal
    .qso-form-hero__input {
      font-family:         var(--app-font-mono) !important;
      font-size:           2.1rem !important;
      color:               var(--ham-glow) !important;
      --placeholder-color: var(--ham-border-hi) !important;
      padding:             0 !important;
    }

    // ── Divisores de sección ──────────────────────────────────────────
    .qso-form__divider {
      height:     1px;
      background: var(--ham-border);
    }

    // ── Filas de 2 columnas (banda/modo, RST sent/rcvd) ─────────────
    .qso-form__row2 {
      display:               grid;
      grid-template-columns: 1fr 1fr;
      background:            var(--ham-surface);
    }

    .qso-form__field {
      padding: 11px 14px;

      &:first-child {
        border-right: 1px solid var(--ham-border);
      }

      &--full {
        background: var(--ham-surface);
        padding:    11px 16px;
      }
    }

    // Label de campo del formulario
    .qso-form__label {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-muted);
      margin-bottom:  6px;
    }

    // Select de banda/modo — ámbar (lectura de frecuencia)
    .qso-form__select {
      font-family: var(--app-font-mono) !important;
      font-size:   1.1rem !important;
      color:       var(--ham-amber) !important;
      font-weight: 400;
      padding:     0;
    }

    // Input de RST — valores de señal
    .qso-form__input--small {
      font-family:         var(--app-font-mono) !important;
      font-size:           1.45rem !important;
      color:               var(--ham-amber) !important;
      padding:             0 !important;
      --placeholder-color: var(--ham-border-hi) !important;
    }

    // Input de grid corresponsal — teal marino (localización)
    .qso-form__input--grid {
      font-family:         var(--app-font-mono) !important;
      font-size:           1.35rem !important;
      color:               var(--ham-text) !important;
      padding:             0 !important;
      --placeholder-color: var(--ham-border-hi) !important;
    }

    // Input de comentario — fuente UI (texto libre, no datos operativos)
    .qso-form__input--comment {
      font-family:         var(--app-font-ui) !important;
      font-size:           0.98rem !important;
      color:               var(--ham-text) !important;
      padding:             0 !important;
      --placeholder-color: var(--ham-border-hi) !important;
    }

    // ── Badge informacional de portapapeles ──────────────────────────
    // Indica origen del valor; desaparece al editar el campo
    .clipboard-badge {
      display:     flex;
      align-items: center;
      gap:         5px;
      margin-top:  7px;
      font-family: var(--app-font-ui);
      font-size:   0.72rem;
      color:       var(--ham-muted);

      ion-icon { font-size: 0.85rem; flex-shrink: 0; }
    }

    // ── Botón guardar ────────────────────────────────────────────────
    .qso-form__save {
      padding:    16px;
      margin-top: 6px;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonInput, IonSelect,
    IonSelectOption, IonIcon,
  ],
})
export class QsoFormModalComponent implements OnInit {
  @Input() myGrid = '';
  @Input() myPlusCode = '';
  @Input() prefillDxGrid = '';

  // Comunicación con el padre SÓLO vía ModalController.dismiss():
  //   dismiss(null, 'cancel')  → canceló
  //   dismiss(entry, 'confirm') → QSO guardado, data = QsoEntry sin id
  private settings   = inject(SettingsService);
  private maidenhead = inject(MaidenheadService);
  private modalCtrl  = inject(ModalController);

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

  // Badge informacional: visible mientras el valor viene del portapapeles
  // Desaparece en cuanto el usuario edita o borra el campo
  readonly fromClipboard = signal(false);

  constructor() {
    addIcons({ closeOutline, saveOutline, radioOutline, clipboardOutline });
  }

  async ngOnInit(): Promise<void> {
    // Prioridad 1: portapapeles — si contiene un grid válido, gana siempre
    try {
      const { value } = await Clipboard.read();
      const candidate = value?.trim().toUpperCase() ?? '';
      if (candidate && this.maidenhead.isValid(candidate)) {
        this.form.update(f => ({ ...f, dxGrid: candidate }));
        this.fromClipboard.set(true);
        return;
      }
    } catch {
      // Portapapeles no disponible o sin permiso — silencioso
    }

    // Prioridad 2: prefillDxGrid (GPS desde home / resultado de lookup)
    if (this.prefillDxGrid) {
      this.form.update(f => ({ ...f, dxGrid: this.prefillDxGrid.toUpperCase() }));
    }
  }

  /** Gestiona cambios en el campo DX grid.
   *  El primer cambio del usuario descarta el badge de portapapeles. */
  onDxGridChange(value: string): void {
    if (this.fromClipboard()) {
      this.fromClipboard.set(false);
    }
    this.updateForm('dxGrid', value);
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

  /** Cierra el modal sin guardar (botón ✕ o swipe) */
  async dismissCancel(): Promise<void> {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  /** Valida, construye el QSO y cierra pasando los datos al padre */
  async save(): Promise<void> {
    if (!this.isValid()) return;
    const now = new Date();
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    const f = this.form();
    const entry: Omit<QsoEntry, 'id'> = {
      call:      (f.call ?? '').toUpperCase().trim(),
      qsoDate:   `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}`,
      timeOn:    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`,
      band:      f.band as QsoBand,
      mode:      f.mode as QsoMode,
      rstSent:   f.rstSent ?? DEFAULT_RST[f.mode as QsoMode],
      rstRcvd:   f.rstRcvd ?? DEFAULT_RST[f.mode as QsoMode],
      dxGrid:    (f.dxGrid ?? '').toUpperCase(),
      myGrid:          this.myGrid,
      myPlusCode:      this.myPlusCode,
      stationCallsign: this.settings.callsign() || undefined,
      comment:         f.comment,
    };
    await this.modalCtrl.dismiss(entry, 'confirm');
  }
}
