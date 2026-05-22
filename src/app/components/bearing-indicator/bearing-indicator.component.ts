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
    // ── Contenedor principal ────────────────────────────────────────────
    .bearing-wrap {
      display:     flex;
      align-items: center;
      gap:         18px;
      padding:     13px 0 10px;
      animation:   fade-up 0.3s ease both;
    }

    // ── Rosa de los vientos — instrumento cartográfico ──────────────────
    .compass-ring {
      position:      relative;
      width:         66px;
      height:        66px;
      border-radius: 50%;
      border:        1.5px solid var(--ham-border);
      flex-shrink:   0;
      background:    var(--ham-surface2, var(--ham-surface));

      // Anillo interior — graduación visual
      &::before {
        content:       '';
        position:      absolute;
        inset:         7px;
        border-radius: 50%;
        border:        1px solid var(--ham-border);
        opacity:       0.45;
      }
    }

    .compass-arrow {
      position:        absolute;
      inset:           0;
      display:         flex;
      align-items:     center;
      justify-content: center;
      // Movimiento fluido con leve bounce — comportamiento de aguja de brújula
      transition:      transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);

      ion-icon {
        font-size: 1.65rem;
        color:     var(--ham-glow);
        // Sin glow filter — la lectura operativa no necesita ornamento CRT
      }
    }

    // Cardinales — micro-labels de orientación
    .compass-cardinal {
      position:       absolute;
      font-family:    var(--app-font-ui);
      font-size:      0.53rem;
      font-weight:    700;
      letter-spacing: 0;
      color:          var(--ham-muted);
      line-height:    1;
    }

    // Norte — resaltado por convención cartográfica
    .compass-N { top: 3px;    left: 50%; transform: translateX(-50%); color: var(--ham-glow); }
    .compass-S { bottom: 3px; left: 50%; transform: translateX(-50%); }
    .compass-E { right: 4px;  top: 50%;  transform: translateY(-50%); }
    .compass-W { left: 4px;   top: 50%;  transform: translateY(-50%); }

    // ── Lecturas de datos — rumbo y distancia ───────────────────────────
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

    // Label de campo operativo
    .bearing-label {
      font-family:    var(--app-font-ui);
      font-size:      var(--app-type-label-size, 0.66rem);
      font-weight:    700;
      letter-spacing: var(--app-type-label-tracking, 0.12em);
      text-transform: uppercase;
      color:          var(--ham-muted);
    }

    // Valor de rumbo — teal marino
    .bearing-value {
      font-family:    var(--app-font-mono);
      font-size:      1.4rem;
      font-weight:    400;
      color:          var(--ham-glow);
      letter-spacing: 0.04em;
      line-height:    1;
    }

    // Valor de distancia — ámbar (análogo a distancia en ploter náutico)
    .distance-value {
      font-family:    var(--app-font-mono);
      font-size:      1.25rem;
      font-weight:    400;
      color:          var(--ham-amber);
      letter-spacing: 0.04em;
      line-height:    1;
    }

    .bearing-unit {
      font-size:      0.76rem;
      font-family:    var(--app-font-ui);
      font-weight:    600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity:        0.75;
    }

    // ── Mobile: quitar brújula, readout horizontal compacto ─────────────
    @media (max-width: 600px) {
      .bearing-wrap {
        padding: 6px 0 4px;
        gap:     10px;
      }
      .compass-ring {
        display: none;
      }
      .bearing-data {
        flex-direction: row;
        gap:            16px;
      }
      .bearing-row {
        flex-direction: row;
        align-items:    center;
        gap:            5px;
      }
      .bearing-value {
        font-size: 1.05rem;
      }
      .distance-value {
        font-size: 1.05rem;
      }
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
