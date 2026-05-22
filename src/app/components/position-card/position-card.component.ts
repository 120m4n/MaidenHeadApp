import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { Share } from '@capacitor/share';
import { addIcons } from 'ionicons';
import { shareOutline, locationOutline, locateOutline, flashOutline } from 'ionicons/icons';
import { Position } from '../../models/position.model';
import { SettingsService } from '../../services/settings.service';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

@Component({
  selector: 'app-position-card',
  template: `
    @if (position) {
      <div class="pos-card" [class.pos-card--locked]="true">

        <!-- ── Status bar ─────────────────────────────────────────── -->
        <div class="pos-card__status">
          <div class="pos-card__status-left">
            <span class="pos-lock-dot"></span>
            <span class="pos-card__status-label">GPS LOCKED</span>
          </div>
          <span class="pos-card__accuracy">
            {{ latDisplay }}&nbsp;{{ lonDisplay }}&ensp;·&ensp;±&thinsp;{{ position.accuracy | number:'1.0-0' }}&thinsp;m
          </span>
        </div>

        <div class="pos-card__divider"></div>

        <!-- ── QTH Locator — hero display ─────────────────────────── -->
        <div class="pos-card__section pos-card__section--paired">
          <div class="pos-card__section-label">QTH LOCATOR</div>
          <div class="pos-card__grid-wrap">
            <div class="pos-card__grid-value">{{ gridDisplay }}</div>
            <div class="pos-card__actions">
              <app-copy-button [value]="gridDisplay" label="QTH Locator" color="primary" fill="clear" />
              <button class="pos-action-btn" (click)="share('grid')" aria-label="Compartir QTH Locator">
                <ion-icon name="share-outline" />
              </button>
            </div>
          </div>
        </div>

        <div class="pos-card__divider"></div>

        <!-- ── Plus Code ───────────────────────────────────────────── -->
        <div class="pos-card__section pos-card__section--paired">
          <div class="pos-card__section-label">PLUS CODE</div>
          <div class="pos-card__plus-wrap">
            <div class="pos-card__plus-value">{{ position.plusCode }}</div>
            <div class="pos-card__actions">
              <app-copy-button [value]="position.plusCode" label="Plus Code" color="primary" fill="clear" />
              <button class="pos-action-btn" (click)="share('plus')" aria-label="Compartir Plus Code">
                <ion-icon name="share-outline" />
              </button>
            </div>
          </div>
        </div>

        <div class="pos-card__divider"></div>

        <!-- ── Coordinates ─────────────────────────────────────────── -->
        <div class="pos-card__coords">
          <ion-icon name="locate-outline" class="pos-card__coord-icon" />
          <span class="pos-card__coord-value">
            {{ position.lat | number:'1.5-5' }}°N&nbsp;&nbsp;{{ position.lon | number:'1.5-5' }}°{{ position.lon < 0 ? 'W' : 'E' }}
          </span>
        </div>

      </div>
    } @else {
      <!-- ── Acquiring ─────────────────────────────────────────────── -->
      <div class="pos-card pos-card--acquiring">
        <div class="pos-card__status">
          <div class="pos-card__status-left">
            <span class="pos-acquire-dot"></span>
            <span class="pos-card__status-label">ACQUIRING GPS</span>
          </div>
        </div>
        <div class="pos-card__no-fix">
          <div class="pos-card__no-fix-grid">——·——</div>
          <div class="pos-card__no-fix-hint">Searching for satellites…</div>
        </div>
      </div>
    }
  `,
  styles: [`
    // ── Card container ──────────────────────────────────────────────────
    .pos-card {
      margin:        8px 10px 0;
      background:    var(--ham-surface);
      border:        1px solid var(--ham-border);
      border-radius: var(--app-card-radius);
      overflow:      hidden;
      animation:     fade-up 0.35s ease both;
      position:      relative;
      box-shadow:    var(--app-shadow-card);

      // Acento de estado en borde superior — cartographic ruleset
      &::before {
        content:    '';
        position:   absolute;
        top:        0;
        left:       0;
        right:      0;
        height:     2px;
        background: var(--ham-glow);
        opacity:    0.55;
      }

      &--acquiring::before {
        background: var(--ham-amber);
        opacity:    0.7;
        animation:  gps-acquire 1.4s ease-in-out infinite;
      }
    }

    // ── Status bar ──────────────────────────────────────────────────────
    .pos-card__status {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      padding:         4px 12px 3px;
    }

    .pos-card__status-left {
      display:     flex;
      align-items: center;
      gap:         7px;
    }

    .pos-card__status-label {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-muted);
    }

    // Punto de estado GPS — sin glow agresivo
    .pos-lock-dot {
      width:         7px;
      height:        7px;
      border-radius: 50%;
      background:    var(--ham-glow);
      flex-shrink:   0;
      // Sombra selectiva — solo en el punto de datos, no en UI chrome
      box-shadow:    0 0 5px rgba(var(--ham-glow-rgb), 0.55);
    }

    .pos-acquire-dot {
      width:         7px;
      height:        7px;
      border-radius: 50%;
      background:    var(--ham-amber);
      flex-shrink:   0;
      animation:     gps-acquire 1.4s ease-in-out infinite;
    }

    .pos-card__accuracy {
      font-family:    var(--app-font-mono);
      font-size:      var(--app-type-meta-size, 0.72rem);
      color:          var(--ham-muted);
      letter-spacing: 0.04em;
      white-space:    nowrap;
    }

    // ── Divider ─────────────────────────────────────────────────────────
    .pos-card__divider {
      height:     1px;
      background: var(--ham-border);
    }

    // ── Section ─────────────────────────────────────────────────────────
    .pos-card__section {
      padding: 5px 12px 4px;
    }

    .pos-card__section-label {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-muted);
      margin-bottom:  3px;
    }

    // ── Valor de grid (hero) — lectura operativa principal ───────────────
    .pos-card__grid-wrap {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      gap:             8px;
    }

    .pos-card__grid-value {
      font-family:    var(--app-font-mono);
      font-size:      var(--app-type-code-size, clamp(1.6rem, 6.5vw, 2.2rem));
      font-weight:    400;
      color:          var(--ham-glow);
      line-height:    1.0;
      letter-spacing: 0.04em;
      // Glow selectivo en el dato operativo — no en UI chrome
      text-shadow:    0 0 18px rgba(var(--ham-glow-rgb), 0.30);
      flex:           1;
      min-width:      0;
      overflow:       hidden;
      text-overflow:  ellipsis;
      white-space:    nowrap;
    }

    // ── Plus Code ────────────────────────────────────────────────────────
    .pos-card__plus-wrap {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      gap:             8px;
    }

    .pos-card__plus-value {
      font-family:    var(--app-font-mono);
      font-size:      var(--app-type-code-size, clamp(1.6rem, 6.5vw, 2.2rem));
      font-weight:    400;
      color:          var(--ham-amber);
      letter-spacing: 0.04em;
      flex:           1;
    }

    // ── Botones de acción ──────────────────────────────────────────────
    .pos-card__actions {
      display:     flex;
      align-items: center;
      gap:         4px;
      flex-shrink: 0;
    }

    .pos-action-btn {
      display:         flex;
      align-items:     center;
      justify-content: center;
      width:           36px;
      height:          36px;
      background:      var(--ham-surface2);
      border:          1px solid var(--ham-muted);
      border-radius:   var(--app-radius-ctrl, 4px);
      color:           var(--ham-text);
      cursor:          pointer;
      transition:      all 0.15s ease;
      -webkit-tap-highlight-color: transparent;

      ion-icon { font-size: 1rem; }

      &:focus-visible {
        outline: 2px solid rgba(var(--ham-glow-rgb), 0.55);
        outline-offset: 1px;
      }

      &:active {
        background:   var(--ham-glow-dim);
        border-color: var(--ham-border-hi);
        color:        var(--ham-glow);
        transform:    scale(0.95);
      }
    }

    // ── Coordenadas ───────────────────────────────────────────────────────
    .pos-card__coords {
      display:     flex;
      align-items: center;
      gap:         8px;
      padding:     4px 12px 5px;
    }

    .pos-card__coord-icon {
      font-size:   0.88rem;
      color:       var(--ham-muted);
      flex-shrink: 0;
    }

    .pos-card__coord-value {
      font-family:    var(--app-font-mono);
      font-size:      var(--app-type-meta-size, 0.72rem);
      color:          var(--ham-muted);
      letter-spacing: 0.04em;
      overflow:       hidden;
      white-space:    nowrap;
      text-overflow:  ellipsis;
    }

    // ── Sin fix GPS ──────────────────────────────────────────────────────
    .pos-card__no-fix {
      padding:    10px 14px 8px;
      text-align: center;
    }

    .pos-card__no-fix-grid {
      font-family:    var(--app-font-mono);
      font-size:      2.4rem;
      color:          var(--ham-border-hi);
      letter-spacing: 0.10em;
      animation:      value-flash 2.2s ease-in-out infinite;
    }

    .pos-card__no-fix-hint {
      font-family:    var(--app-font-ui);
      font-size:      0.76rem;
      color:          var(--ham-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top:     8px;
    }

    // ── Mobile: máxima compacidad para priorizar el mapa ────────────────
    @media (max-width: 600px) {
      .pos-card {
        margin: 4px 8px 0;
      }
      .pos-card__status {
        padding: 2px 10px 2px;
      }
      .pos-card__coords {
        display: none;
      }
      .pos-card__section {
        padding: 1px 10px 1px;
      }
      // .pos-card__section-label visible — ocupa espacio ya reservado por min-height: 58px
      .pos-card__grid-value,
      .pos-card__plus-value {
        font-size: 1.25rem;
      }
      .pos-card__actions {
        gap: 2px;
      }
      .pos-action-btn {
        width: 28px;
        height: 28px;
        ion-icon { font-size: 0.82rem; }
      }
    }

  `],
  imports: [
    CommonModule,
    IonIcon,
    CopyButtonComponent,
  ],
})
export class PositionCardComponent {
  @Input() position: Position | null = null;
  private settings = inject(SettingsService);

  constructor() {
    addIcons({ shareOutline, locationOutline, locateOutline, flashOutline });
  }

  get latDisplay(): string {
    if (!this.position) return '';
    const abs = Math.abs(this.position.lat).toFixed(3);
    return `${abs}°${this.position.lat >= 0 ? 'N' : 'S'}`;
  }

  get lonDisplay(): string {
    if (!this.position) return '';
    const abs = Math.abs(this.position.lon).toFixed(3);
    return `${abs}°${this.position.lon < 0 ? 'W' : 'E'}`;
  }

  get gridDisplay(): string {
    if (!this.position) return '';
    const p = this.settings.gridPrecision();
    return p === 4 ? this.position.grid4
      : p === 8 ? this.position.grid8
      : this.position.grid6;
  }

  get precisionLabel(): string {
    const p = this.settings.gridPrecision();
    const labels: Record<number, string> = {
      4: '4 chars · field ~111×111 km',
      6: '6 chars · square ~5×2 km',
      8: '8 chars · subsquare ~500×250 m',
    };
    return labels[p] ?? '';
  }

  async share(type: 'grid' | 'plus'): Promise<void> {
    if (!this.position) return;
    const value = type === 'grid' ? this.gridDisplay : this.position.plusCode;
    const label = type === 'grid' ? 'QTH Locator' : 'Plus Code';
    await Share.share({
      title: label,
      text: `Mi ${label}: ${value}`,
      dialogTitle: `Compartir ${label}`,
    });
  }
}
