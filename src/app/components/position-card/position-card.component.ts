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
            ± {{ position.accuracy | number:'1.0-0' }} m
          </span>
        </div>

        <div class="pos-card__divider"></div>

        <!-- ── QTH Locator — hero display ─────────────────────────── -->
        <div class="pos-card__section">
          <div class="pos-card__section-label">QTH LOCATOR · MAIDENHEAD</div>
          <div class="pos-card__grid-wrap">
            <div class="pos-card__grid-value">{{ gridDisplay }}</div>
            <div class="pos-card__actions">
              <app-copy-button [value]="gridDisplay" label="QTH Locator" color="primary" fill="clear" />
              <button class="pos-action-btn" (click)="share('grid')" aria-label="Compartir QTH Locator">
                <ion-icon name="share-outline" />
              </button>
            </div>
          </div>
          <div class="pos-card__grid-sub">{{ precisionLabel }}</div>
        </div>

        <div class="pos-card__divider"></div>

        <!-- ── Plus Code ───────────────────────────────────────────── -->
        <div class="pos-card__section">
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
      margin: 12px 12px 0;
      background:    var(--ham-surface);
      border:        1px solid var(--ham-border);
      border-radius: var(--app-card-radius);
      overflow:      hidden;
      animation:     fade-up 0.35s ease both;
      position:      relative;

      // Phosphor top accent
      &::before {
        content:    '';
        position:   absolute;
        top:        0;
        left:       0;
        right:      0;
        height:     2px;
        background: var(--ham-glow);
        opacity:    0.7;
      }

      &--acquiring::before {
        background: var(--ham-amber);
        animation:  gps-acquire 1.4s ease-in-out infinite;
      }
    }

    // ── Status bar ──────────────────────────────────────────────────────
    .pos-card__status {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      padding:         10px 14px 9px;
    }

    .pos-card__status-left {
      display:     flex;
      align-items: center;
      gap:         8px;
    }

    .pos-card__status-label {
      font-family:    var(--app-font-ui);
      font-size:      0.68rem;
      font-weight:    700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color:          var(--ham-muted);
    }

    .pos-lock-dot {
      width:         8px;
      height:        8px;
      border-radius: 50%;
      background:    var(--ham-glow);
      box-shadow:    0 0 6px var(--ham-glow), 0 0 12px rgba(var(--ham-glow-rgb), 0.4);
      flex-shrink:   0;
    }

    .pos-acquire-dot {
      width:         8px;
      height:        8px;
      border-radius: 50%;
      background:    var(--ham-amber);
      box-shadow:    0 0 6px var(--ham-amber);
      flex-shrink:   0;
      animation:     gps-acquire 1.4s ease-in-out infinite;
    }

    .pos-card__accuracy {
      font-family:    var(--app-font-mono);
      font-size:      0.72rem;
      color:          var(--ham-muted);
      letter-spacing: 0.05em;
    }

    // ── Divider ─────────────────────────────────────────────────────────
    .pos-card__divider {
      height:     1px;
      background: var(--ham-border);
    }

    // ── Section ─────────────────────────────────────────────────────────
    .pos-card__section {
      padding: 12px 14px 10px;
    }

    .pos-card__section-label {
      font-family:    var(--app-font-ui);
      font-size:      0.65rem;
      font-weight:    700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color:          var(--ham-muted);
      margin-bottom:  4px;
    }

    // ── Grid value (hero) ────────────────────────────────────────────────
    .pos-card__grid-wrap {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      gap:             8px;
    }

    .pos-card__grid-value {
      font-family:  var(--app-font-mono);
      font-size:    clamp(2rem, 8vw, 2.8rem);
      font-weight:  400;
      color:        var(--ham-glow);
      line-height:  1.0;
      letter-spacing: 0.04em;
      text-shadow:  0 0 24px rgba(var(--ham-glow-rgb), 0.5);
      flex:         1;
      min-width:    0;
      overflow:     hidden;
      text-overflow: ellipsis;
      white-space:  nowrap;
    }

    .pos-card__grid-sub {
      font-family:    var(--app-font-ui);
      font-size:      0.7rem;
      color:          var(--ham-muted);
      letter-spacing: 0.08em;
      margin-top:     3px;
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
      font-size:      clamp(1.15rem, 4.5vw, 1.5rem);
      font-weight:    400;
      color:          var(--ham-amber);
      letter-spacing: 0.04em;
      text-shadow:    0 0 16px rgba(var(--ham-amber-rgb), 0.4);
      flex:           1;
    }

    // ── Action buttons ────────────────────────────────────────────────────
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
      width:           44px;
      height:          44px;
      background:      transparent;
      border:          1px solid var(--ham-border);
      border-radius:   var(--app-card-radius);
      color:           var(--ham-muted);
      cursor:          pointer;
      transition:      all 0.15s ease;
      -webkit-tap-highlight-color: transparent;

      ion-icon { font-size: 1.2rem; }

      &:active {
        background: var(--ham-glow-dim);
        border-color: var(--ham-glow);
        color: var(--ham-glow);
        transform: scale(0.95);
      }
    }

    // ── Coordinates ───────────────────────────────────────────────────────
    .pos-card__coords {
      display:     flex;
      align-items: center;
      gap:         8px;
      padding:     8px 14px 10px;
    }

    .pos-card__coord-icon {
      font-size:   0.9rem;
      color:       var(--ham-muted);
      flex-shrink: 0;
    }

    .pos-card__coord-value {
      font-family:    var(--app-font-mono);
      font-size:      0.82rem;
      color:          var(--ham-muted);
      letter-spacing: 0.03em;
      overflow:       hidden;
      white-space:    nowrap;
      text-overflow:  ellipsis;
    }

    // ── No-fix state ─────────────────────────────────────────────────────
    .pos-card__no-fix {
      padding:    24px 14px 20px;
      text-align: center;
    }

    .pos-card__no-fix-grid {
      font-family:    var(--app-font-mono);
      font-size:      2.4rem;
      color:          var(--ham-border-hi);
      letter-spacing: 0.1em;
      animation:      value-flash 2s ease-in-out infinite;
    }

    .pos-card__no-fix-hint {
      font-family:    var(--app-font-ui);
      font-size:      0.78rem;
      color:          var(--ham-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top:     8px;
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
