import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { navigateOutline } from 'ionicons/icons';
import { BearingResult } from '../../services/bearing.service';

@Component({
  selector: 'app-bearing-indicator',
  template: `
    @if (result) {
      <div class="bearing-wrap">

        <!-- Compass ring -->
        <div class="compass-ring">
          <div class="compass-arrow" [style.transform]="'rotate(' + result.bearingDeg + 'deg)'">
            <ion-icon name="navigate-outline" aria-hidden="true" />
          </div>
          <!-- Cardinal markers -->
          <span class="compass-cardinal compass-N">N</span>
          <span class="compass-cardinal compass-E">E</span>
          <span class="compass-cardinal compass-S">S</span>
          <span class="compass-cardinal compass-W">W</span>
        </div>

        <!-- Data readout -->
        <div class="bearing-data">
          <div class="bearing-row">
            <span class="bearing-label">BEARING</span>
            <span class="bearing-value">{{ result.bearingDeg }}°&thinsp;{{ result.bearingCard }}</span>
          </div>
          <div class="bearing-row">
            <span class="bearing-label">DISTANCE</span>
            <span class="distance-value">
              @if (unit === 'km') {
                {{ result.km }}&thinsp;<span class="bearing-unit">km</span>
              } @else {
                {{ result.nm }}&thinsp;<span class="bearing-unit">NM</span>
              }
            </span>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .bearing-wrap {
      display:         flex;
      align-items:     center;
      gap:             20px;
      padding:         14px 0 10px;
      animation:       fade-up 0.3s ease both;
    }

    // ── Compass ──────────────────────────────────────────────────────────
    .compass-ring {
      position:      relative;
      width:         68px;
      height:        68px;
      border-radius: 50%;
      border:        2px solid var(--ham-border);
      flex-shrink:   0;
      background:    var(--ham-surface2, var(--ham-surface));

      &::before {
        content:    '';
        position:   absolute;
        inset:      6px;
        border-radius: 50%;
        border:     1px solid var(--ham-border);
        opacity:    0.5;
      }
    }

    .compass-arrow {
      position:   absolute;
      inset:      0;
      display:    flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);

      ion-icon {
        font-size: 1.7rem;
        color:     var(--ham-glow);
        filter:    drop-shadow(0 0 4px rgba(var(--ham-glow-rgb), 0.6));
      }
    }

    .compass-cardinal {
      position:       absolute;
      font-family:    var(--app-font-ui);
      font-size:      0.55rem;
      font-weight:    700;
      letter-spacing: 0;
      color:          var(--ham-muted);
      line-height:    1;
    }

    .compass-N { top: 3px;  left: 50%; transform: translateX(-50%); color: var(--ham-glow); }
    .compass-S { bottom: 3px; left: 50%; transform: translateX(-50%); }
    .compass-E { right: 4px; top: 50%; transform: translateY(-50%); }
    .compass-W { left: 4px;  top: 50%; transform: translateY(-50%); }

    // ── Data ─────────────────────────────────────────────────────────────
    .bearing-data {
      display:        flex;
      flex-direction: column;
      gap:            8px;
      flex:           1;
    }

    .bearing-row {
      display:        flex;
      flex-direction: column;
      gap:            2px;
    }

    .bearing-label {
      font-family:    var(--app-font-ui);
      font-size:      0.62rem;
      font-weight:    700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color:          var(--ham-muted);
    }

    .bearing-value {
      font-family:    var(--app-font-mono);
      font-size:      1.4rem;
      font-weight:    400;
      color:          var(--ham-glow);
      letter-spacing: 0.04em;
      text-shadow:    0 0 16px rgba(var(--ham-glow-rgb), 0.4);
      line-height:    1;
    }

    .distance-value {
      font-family:    var(--app-font-mono);
      font-size:      1.25rem;
      font-weight:    400;
      color:          var(--ham-amber);
      letter-spacing: 0.04em;
      text-shadow:    0 0 12px rgba(var(--ham-amber-rgb), 0.35);
      line-height:    1;
    }

    .bearing-unit {
      font-size:      0.8rem;
      font-family:    var(--app-font-ui);
      font-weight:    600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity:        0.8;
    }
  `],
  imports: [CommonModule, IonIcon],
})
export class BearingIndicatorComponent {
  @Input() result: BearingResult | null = null;
  @Input() unit: 'km' | 'nm' = 'km';

  constructor() {
    addIcons({ navigateOutline });
  }
}
