import { Component, Input, signal } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { copyOutline, checkmarkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-copy-button',
  template: `
    <ion-button
      [color]="copied() ? 'success' : color"
      [fill]="fill"
      class="cta-large"
      (click)="copy()"
      [attr.aria-label]="'Copiar ' + label">
      <ion-icon slot="icon-only" [name]="copied() ? 'checkmark-outline' : 'copy-outline'" />
    </ion-button>
  `,
  styles: [`
    ion-button {
      --min-height: var(--app-cta-min-size);
      --min-width: var(--app-cta-min-size);
    }
  `],
  imports: [IonButton, IonIcon],
})
export class CopyButtonComponent {
  @Input() value = '';
  @Input() label = 'valor';
  @Input() color = 'primary';
  @Input() fill: 'clear' | 'outline' | 'solid' = 'outline';

  copied = signal(false);

  constructor() {
    addIcons({ copyOutline, checkmarkOutline });
  }

  async copy(): Promise<void> {
    if (!this.value) return;
    await Clipboard.write({ string: this.value });
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
