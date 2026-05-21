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
      <div class="bearing-card">
        <div class="arrow-wrap">
          <ion-icon
            name="navigate-outline"
            [style.transform]="'rotate(' + result.bearingDeg + 'deg)'"
            class="arrow-icon"
            aria-hidden="true" />
        </div>
        <div class="bearing-data">
          <span class="bearing-deg">{{ result.bearingDeg }}° {{ result.bearingCard }}</span>
          <span class="distance">
            @if (unit === 'km') {
              {{ result.km }} km
            } @else {
              {{ result.nm }} NM
            }
          </span>
        </div>
      </div>
    }
  `,
  styles: [`
    .bearing-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
    }
    .arrow-wrap {
      background: var(--ion-color-primary);
      border-radius: 50%;
      width: 56px; height: 56px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .arrow-icon {
      font-size: 1.8rem;
      color: white;
      transition: transform 0.4s ease;
    }
    .bearing-data {
      display: flex;
      flex-direction: column;
    }
    .bearing-deg {
      font-family: var(--app-font-mono);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--ion-text-color);
    }
    .distance {
      font-size: 1.1rem;
      color: var(--ion-color-secondary);
      font-weight: 600;
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
