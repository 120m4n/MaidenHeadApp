import { Component, inject } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

interface ModeEntry {
  sigla:   string;
  nombre:  string;
  desc:    string;
  descLong: string;  // solo desktop
  rst:     string;
  color:   'glow' | 'amber' | 'sky' | 'muted';
}

const MODES: ModeEntry[] = [
  {
    sigla:    'SSB',
    nombre:   'Single Side Band',
    desc:     'Voz en HF · el más usado',
    descLong: 'Voz en HF. El modo más común en radioafición. USB por encima de 10 MHz, LSB por debajo.',
    rst:      '59',
    color:    'glow',
  },
  {
    sigla:    'CW',
    nombre:   'Continuous Wave',
    desc:     'Código Morse',
    descLong: 'Código Morse telegráfico. Alta penetración en señales débiles. Requiere licencia clase A/B en España.',
    rst:      '599',
    color:    'glow',
  },
  {
    sigla:    'FT8',
    nombre:   'Franke-Taylor 8-FSK',
    desc:     'Digital débil señal · 15 s/QSO',
    descLong: 'Modo digital de señal débil. Cada transmisión dura 15 segundos. Requiere WSJT-X y sincronía de reloj.',
    rst:      '−10 dB',
    color:    'sky',
  },
  {
    sigla:    'FT4',
    nombre:   'Franke-Taylor 4-FSK',
    desc:     'Como FT8 · 7.5 s/QSO',
    descLong: 'Variante de FT8 más rápida (7.5 s por transmisión). Menos sensible pero mayor throughput.',
    rst:      '−10 dB',
    color:    'sky',
  },
  {
    sigla:    'AM',
    nombre:   'Amplitude Modulation',
    desc:     'Voz amplitud · legado',
    descLong: 'Modulación de amplitud. Usado en onda media/corta y bandas de aviación. Baja eficiencia de potencia.',
    rst:      '59',
    color:    'amber',
  },
  {
    sigla:    'FM',
    nombre:   'Frequency Modulation',
    desc:     'Voz VHF/UHF · repetidores',
    descLong: 'Modulación de frecuencia. Modo dominante en VHF/UHF, satélite y repetidores. Muy buena calidad de audio.',
    rst:      '59',
    color:    'amber',
  },
  {
    sigla:    'DIGI',
    nombre:   'Digital',
    desc:     'RTTY · PSK31 · JS8 · otros',
    descLong: 'Modos digitales variados: RTTY, PSK31, JS8Call, Olivia, Winlink… Requieren interfaz de audio o TNC.',
    rst:      '59',
    color:    'muted',
  },
  {
    sigla:    'OTHER',
    nombre:   'Otro modo',
    desc:     'Cualquier modo no listado',
    descLong: 'Modo no incluido en la lista: SSTV, ATV, Hellschreiber, EME, etc.',
    rst:      '59',
    color:    'muted',
  },
];

@Component({
  selector: 'app-ham-ref-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>CHULETA HAM</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" aria-label="Cerrar">
            <ion-icon slot="icon-only" name="close-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ref-layout">

        <!-- ── Columna Modos ───────────────────────────── -->
        <div class="ref-col">
          <div class="ref-section-title">MODOS DE CONTACTO</div>

          @for (m of modes; track m.sigla) {
            <div class="mode-card">
              <div class="mode-card__top">
                <span class="mode-card__sigla" [attr.data-color]="m.color">{{ m.sigla }}</span>
                <span class="mode-card__rst" [attr.data-color]="m.color">{{ m.rst }}</span>
              </div>
              <div class="mode-card__nombre">{{ m.nombre }}</div>
              <div class="mode-card__desc mode-card__desc--short">{{ m.desc }}</div>
              <div class="mode-card__desc mode-card__desc--long">{{ m.descLong }}</div>
            </div>
          }
        </div>

        <!-- ── Columna RST ─────────────────────────────── -->
        <div class="ref-col ref-col--rst">
          <div class="ref-section-title">SISTEMA RST</div>

          <!-- R -->
          <div class="rst-block">
            <div class="rst-block__head">
              <span class="rst-block__letter">R</span>
              <span class="rst-block__name">LEGIBILIDAD</span>
              <span class="rst-block__range">1 — 5</span>
            </div>
            <div class="rst-block__scale">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="rst-block__dot" [class.rst-block__dot--on]="i <= 4"></div>
              }
            </div>
            <div class="rst-items">
              <div class="rst-item"><span class="rst-item__val">1</span><span class="rst-item__label">Ininteligible</span></div>
              <div class="rst-item"><span class="rst-item__val">2</span><span class="rst-item__label">Apenas perceptible</span></div>
              <div class="rst-item"><span class="rst-item__val">3</span><span class="rst-item__label">Difícil con esfuerzo</span></div>
              <div class="rst-item"><span class="rst-item__val">4</span><span class="rst-item__label">Con algo de dificultad</span></div>
              <div class="rst-item rst-item--best"><span class="rst-item__val">5</span><span class="rst-item__label">Perfectamente legible</span></div>
            </div>
          </div>

          <!-- S -->
          <div class="rst-block">
            <div class="rst-block__head">
              <span class="rst-block__letter">S</span>
              <span class="rst-block__name">POTENCIA</span>
              <span class="rst-block__range">1 — 9</span>
            </div>
            <div class="rst-block__scale">
              @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
                <div class="rst-block__dot" [class.rst-block__dot--on]="i <= 7"></div>
              }
            </div>
            <div class="rst-items rst-items--compact">
              <div class="rst-item"><span class="rst-item__val">1</span><span class="rst-item__label">Apenas perceptible</span></div>
              <div class="rst-item"><span class="rst-item__val">3</span><span class="rst-item__label">Señal débil</span></div>
              <div class="rst-item"><span class="rst-item__val">5</span><span class="rst-item__label">Señal buena</span></div>
              <div class="rst-item"><span class="rst-item__val">7</span><span class="rst-item__label">Moderadamente fuerte</span></div>
              <div class="rst-item rst-item--best"><span class="rst-item__val">9</span><span class="rst-item__label">Extremadamente fuerte</span></div>
            </div>
          </div>

          <!-- T -->
          <div class="rst-block">
            <div class="rst-block__head">
              <span class="rst-block__letter">T</span>
              <span class="rst-block__name">TONO</span>
              <span class="rst-block__range rst-block__range--cw">solo CW · 1 — 9</span>
            </div>
            <div class="rst-block__scale">
              @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
                <div class="rst-block__dot" [class.rst-block__dot--on]="i <= 9"></div>
              }
            </div>
            <div class="rst-items rst-items--compact">
              <div class="rst-item"><span class="rst-item__val">1</span><span class="rst-item__label">Muy áspero / interferido</span></div>
              <div class="rst-item"><span class="rst-item__val">5</span><span class="rst-item__label">Tono musical</span></div>
              <div class="rst-item rst-item--best"><span class="rst-item__val">9</span><span class="rst-item__label">Tono puro perfecto</span></div>
            </div>
          </div>

          <!-- Ejemplos -->
          <div class="rst-examples">
            <div class="rst-section-title">EJEMPLOS TÍPICOS</div>
            <div class="rst-ex-row">
              <span class="rst-ex__val">59</span>
              <span class="rst-ex__label">Voz perfecta (SSB / AM / FM)</span>
            </div>
            <div class="rst-ex-row">
              <span class="rst-ex__val">599</span>
              <span class="rst-ex__label">CW perfecto (Morse)</span>
            </div>
            <div class="rst-ex-row">
              <span class="rst-ex__val">−10 dB</span>
              <span class="rst-ex__label">FT8/FT4 señal típica</span>
            </div>
            <div class="rst-ex-row">
              <span class="rst-ex__val">+10 dB</span>
              <span class="rst-ex__label">FT8/FT4 señal fuerte</span>
            </div>
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--ham-bg); }

    // ── Layout responsivo ─────────────────────────────────────────────
    // Mobile: columna única (scroll vertical)
    // Desktop (≥768px): dos columnas lado a lado
    .ref-layout {
      display:   flex;
      flex-direction: column;
      padding:   12px;
      gap:       20px;
    }

    @media (min-width: 768px) {
      .ref-layout {
        flex-direction: row;
        align-items:    flex-start;
        padding:        20px;
        gap:            20px;
      }

      .ref-col {
        flex: 1;
        min-width: 0;
      }
    }

    // ── Título de sección ─────────────────────────────────────────────
    .ref-section-title {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-glow);
      margin-bottom:  10px;
    }

    // ── Cards de modos ────────────────────────────────────────────────
    .mode-card {
      background:    var(--ham-surface);
      border:        1px solid var(--ham-border);
      border-radius: var(--app-card-radius, 6px);
      padding:       10px 12px;
      margin-bottom: 6px;
    }

    .mode-card__top {
      display:         flex;
      justify-content: space-between;
      align-items:     baseline;
      margin-bottom:   3px;
    }

    .mode-card__sigla {
      font-family:    var(--app-font-mono);
      font-size:      1.05rem;
      font-weight:    700;
      letter-spacing: 0.06em;

      &[data-color="glow"]  { color: var(--ham-glow); }
      &[data-color="amber"] { color: var(--ham-amber); }
      &[data-color="sky"]   { color: var(--ham-sky); }
      &[data-color="muted"] { color: var(--ham-muted); }
    }

    .mode-card__rst {
      font-family:  var(--app-font-mono);
      font-size:    0.78rem;
      padding:      1px 7px;
      border-radius: var(--app-radius-badge, 3px);
      border:       1px solid transparent;

      &[data-color="glow"]  {
        color:      var(--ham-glow);
        background: var(--ham-glow-dim);
        border-color: rgba(var(--ham-glow-rgb), 0.2);
      }
      &[data-color="amber"] {
        color:      var(--ham-amber);
        background: rgba(var(--ham-amber-rgb, 214,152,55), 0.1);
        border-color: rgba(var(--ham-amber-rgb, 214,152,55), 0.2);
      }
      &[data-color="sky"] {
        color:      var(--ham-sky);
        background: rgba(var(--ham-sky-rgb, 56,189,248), 0.1);
        border-color: rgba(var(--ham-sky-rgb, 56,189,248), 0.2);
      }
      &[data-color="muted"] {
        color:      var(--ham-muted);
        background: var(--ham-border);
      }
    }

    .mode-card__nombre {
      font-family:  var(--app-font-ui);
      font-size:    0.72rem;
      font-weight:  600;
      color:        var(--ham-muted);
      margin-bottom: 2px;
    }

    // Descripción corta: siempre visible
    .mode-card__desc { font-family: var(--app-font-ui); font-size: 0.82rem; color: var(--ham-text); line-height: 1.4; }

    // Descripción larga: solo desktop
    .mode-card__desc--long  { display: none; }
    .mode-card__desc--short { display: block; }

    @media (min-width: 768px) {
      .mode-card__desc--long  { display: block; }
      .mode-card__desc--short { display: none; }
    }

    // ── Bloques RST ───────────────────────────────────────────────────
    .rst-block {
      background:    var(--ham-surface);
      border:        1px solid var(--ham-border);
      border-radius: var(--app-card-radius, 6px);
      padding:       10px 12px;
      margin-bottom: 6px;
    }

    .rst-block__head {
      display:     flex;
      align-items: baseline;
      gap:         8px;
      margin-bottom: 8px;
    }

    .rst-block__letter {
      font-family:  var(--app-font-mono);
      font-size:    1.4rem;
      font-weight:  700;
      color:        var(--ham-glow);
      line-height:  1;
    }

    .rst-block__name {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color:          var(--ham-muted);
      flex:           1;
    }

    .rst-block__range {
      font-family:  var(--app-font-mono);
      font-size:    0.75rem;
      color:        var(--ham-glow);

      &--cw {
        font-size:    0.65rem;
        color:        var(--ham-amber);
        letter-spacing: 0;
        font-family:  var(--app-font-ui);
      }
    }

    // Escala de puntos visual
    .rst-block__scale {
      display:       flex;
      gap:           4px;
      margin-bottom: 8px;
    }

    .rst-block__dot {
      width:         8px;
      height:        8px;
      border-radius: 50%;
      background:    var(--ham-border);
      flex-shrink:   0;

      &--on { background: var(--ham-glow); }
    }

    // Filas de valores RST
    .rst-items {
      display:        flex;
      flex-direction: column;
      gap:            4px;

      &--compact { gap: 3px; }
    }

    .rst-item {
      display:     flex;
      align-items: baseline;
      gap:         8px;

      &--best .rst-item__val,
      &--best .rst-item__label { color: var(--ham-glow); font-weight: 600; }
    }

    .rst-item__val {
      font-family:  var(--app-font-mono);
      font-size:    0.85rem;
      color:        var(--ham-amber);
      width:        18px;
      flex-shrink:  0;
      text-align:   right;
    }

    .rst-item__label {
      font-family:  var(--app-font-ui);
      font-size:    0.80rem;
      color:        var(--ham-text);
    }

    // ── Ejemplos típicos ──────────────────────────────────────────────
    .rst-examples {
      background:    var(--ham-surface);
      border:        1px solid var(--ham-border);
      border-radius: var(--app-card-radius, 6px);
      padding:       10px 12px;
    }

    .rst-section-title {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-muted);
      margin-bottom:  8px;
    }

    .rst-ex-row {
      display:     flex;
      align-items: baseline;
      gap:         10px;
      padding:     4px 0;
      border-bottom: 1px solid var(--ham-border);

      &:last-child { border-bottom: none; }
    }

    .rst-ex__val {
      font-family:  var(--app-font-mono);
      font-size:    0.9rem;
      color:        var(--ham-amber);
      width:        54px;
      flex-shrink:  0;
    }

    .rst-ex__label {
      font-family:  var(--app-font-ui);
      font-size:    0.80rem;
      color:        var(--ham-text);
    }
  `],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonIcon,
  ],
})
export class HamRefModalComponent {
  private modalCtrl = inject(ModalController);

  readonly modes = MODES;

  constructor() {
    addIcons({ closeOutline });
  }

  async close(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
