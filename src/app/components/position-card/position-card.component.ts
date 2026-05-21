import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonButton, IonIcon, IonBadge,
} from '@ionic/angular/standalone';
import { Share } from '@capacitor/share';
import { addIcons } from 'ionicons';
import { shareOutline, locationOutline } from 'ionicons/icons';
import { Position } from '../../models/position.model';
import { SettingsService } from '../../services/settings.service';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

@Component({
  selector: 'app-position-card',
  template: `
    @if (position) {
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="location-outline" /> Mi QTH
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>

          <!-- QTH Locator (Maidenhead) -->
          <div class="locator-row">
            <div class="locator-block">
              <span class="locator-label">QTH Locator (Maidenhead)</span>
              <span class="grid-value">{{ gridDisplay }}</span>
            </div>
            <div class="btn-group">
              <app-copy-button [value]="gridDisplay" label="QTH Locator" />
              <ion-button fill="outline" class="cta-large" (click)="share('grid')"
                          aria-label="Compartir QTH Locator">
                <ion-icon slot="icon-only" name="share-outline" />
              </ion-button>
            </div>
          </div>

          <!-- Plus Code -->
          <div class="locator-row">
            <div class="locator-block">
              <span class="locator-label">Plus Code</span>
              <span class="grid-value plus-code">{{ position.plusCode }}</span>
            </div>
            <div class="btn-group">
              <app-copy-button [value]="position.plusCode" label="Plus Code" />
              <ion-button fill="outline" class="cta-large" (click)="share('plus')"
                          aria-label="Compartir Plus Code">
                <ion-icon slot="icon-only" name="share-outline" />
              </ion-button>
            </div>
          </div>

          <!-- Coordenadas -->
          <div class="coord-row">
            <span class="coord-value small">
              {{ position.lat | number:'1.5-5' }}°N &nbsp;
              {{ position.lon | number:'1.5-5' }}°E
            </span>
            <ion-badge color="medium">±{{ position.accuracy | number:'1.0-0' }} m</ion-badge>
          </div>

        </ion-card-content>
      </ion-card>
    } @else {
      <ion-card>
        <ion-card-content class="no-pos">
          <ion-icon name="location-outline" class="no-pos-icon" />
          <p>Obteniendo posición GPS…</p>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: [`
    ion-card { --border-radius: var(--app-card-radius); margin: 8px; }
    .locator-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 0;
      border-bottom: 1px solid var(--ion-color-light);
    }
    .locator-row:last-of-type { border-bottom: none; }
    .locator-block { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .locator-label {
      font-size: 0.72rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--ion-color-medium);
      margin-bottom: 2px;
    }
    .grid-value { font-family: var(--app-font-mono); font-size: 1.75rem; font-weight: 700; }
    .plus-code { font-size: 1.3rem; }
    .btn-group { display: flex; gap: 4px; flex-shrink: 0; }
    .coord-row {
      display: flex; align-items: center; gap: 8px;
      padding-top: 8px;
    }
    .coord-value.small { font-family: var(--app-font-mono); font-size: 0.9rem; color: var(--ion-color-medium); }
    .no-pos { text-align: center; padding: 24px; }
    .no-pos-icon { font-size: 2.5rem; color: var(--ion-color-medium); }
  `],
  imports: [
    CommonModule,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonButton, IonIcon, IonBadge,
    CopyButtonComponent,
  ],
})
export class PositionCardComponent {
  @Input() position: Position | null = null;
  private settings = inject(SettingsService);

  constructor() {
    addIcons({ shareOutline, locationOutline });
  }

  get gridDisplay(): string {
    if (!this.position) return '';
    const p = this.settings.gridPrecision();
    return p === 4 ? this.position.grid4
      : p === 8 ? this.position.grid8
      : this.position.grid6;
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
