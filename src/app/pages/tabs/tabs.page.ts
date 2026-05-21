import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline, searchOutline, listOutline, settingsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">

        <ion-tab-button tab="home">
          <ion-icon name="location-outline" />
          <ion-label>MI QTH</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="grid-lookup">
          <ion-icon name="search-outline" />
          <ion-label>LOOKUP</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="qso-log">
          <ion-icon name="list-outline" />
          <ion-label>QSO LOG</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings">
          <ion-icon name="settings-outline" />
          <ion-label>CONFIG</ion-label>
        </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background:     var(--ion-tab-bar-background, #06080a);
      --border:         1px solid var(--ion-tab-bar-border-color, #1a2b1c);
      --color:          var(--ham-muted, #4a6a4c);
      --color-selected: var(--ham-glow, #39ff14);
      height: 56px;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    ion-tab-button {
      font-family:    var(--app-font-ui, 'Barlow Condensed', sans-serif);
      font-size:      0.6rem;
      font-weight:    700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      --color:         var(--ham-muted, #4a6a4c);
      --color-selected: var(--ham-glow, #39ff14);

      ion-icon {
        font-size:       1.25rem;
        margin-bottom:   2px;
        transition:      filter 0.2s ease, transform 0.2s ease, color 0.2s ease;
      }

      ion-label {
        font-family:    inherit;
        font-size:      inherit;
        font-weight:    inherit;
        letter-spacing: inherit;
      }
    }

    ion-tab-button.tab-selected {
      ion-icon {
        filter:    drop-shadow(0 0 5px var(--ham-glow, #39ff14));
        transform: translateY(-1px);
      }
    }
  `],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({ locationOutline, searchOutline, listOutline, settingsOutline });
  }
}
