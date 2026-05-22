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
      --background:     var(--ion-tab-bar-background);
      --border:         1px solid var(--ion-tab-bar-border-color);
      --color:          var(--ham-muted);
      --color-selected: var(--ham-glow);
      height: 56px;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    ion-tab-button {
      font-family:      var(--app-font-ui, 'Barlow Condensed', sans-serif);
      font-size:        var(--app-type-label-size, 0.66rem);
      font-weight:      600;
      letter-spacing:   var(--app-type-label-tracking, 0.12em);
      text-transform:   uppercase;
      --color:          var(--ham-muted);
      --color-selected: var(--ham-glow);
      position:         relative;

      ion-icon {
        font-size:    1.22rem;
        margin-bottom: 2px;
        transition:   color 0.2s ease;
      }

      ion-label {
        font-family:    inherit;
        font-size:      inherit;
        font-weight:    inherit;
        letter-spacing: inherit;
      }
    }

    // Indicador de tab activo — línea cartográfica en borde superior
    ion-tab-button.tab-selected::after {
      content:       '';
      position:      absolute;
      top:           0;
      left:          22%;
      right:         22%;
      height:        2px;
      background:    var(--ham-glow);
      border-radius: 0 0 2px 2px;
    }
  `],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({ locationOutline, searchOutline, listOutline, settingsOutline });
  }
}
