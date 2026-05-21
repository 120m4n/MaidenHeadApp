import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, searchOutline, listOutline, settingsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">

        <ion-tab-button tab="home">
          <ion-icon name="location-outline" />
          <ion-label>Mi QTH</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="grid-lookup">
          <ion-icon name="search-outline" />
          <ion-label>Grid Lookup</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="qso-log">
          <ion-icon name="list-outline" />
          <ion-label>QSO Log</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings">
          <ion-icon name="settings-outline" />
          <ion-label>Ajustes</ion-label>
        </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({ locationOutline, searchOutline, listOutline, settingsOutline });
  }
}
