import { Component, Input, signal } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { copyOutline, checkmarkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-copy-button',
  template: `
    <button
      class="copy-btn"
      [class.copy-btn--done]="copied()"
      (click)="copy()"
      [attr.aria-label]="'Copiar ' + label">
      <ion-icon [name]="copied() ? 'checkmark-outline' : 'copy-outline'" />
    </button>
  `,
  styles: [`
    .copy-btn {
      display:         flex;
      align-items:     center;
      justify-content: center;
      width:           32px;
      height:          32px;
      background:      var(--ham-surface2);
      border:          1px solid var(--ham-muted);
      border-radius:   var(--app-radius-ctrl, 4px);
      color:           var(--ham-text);
      cursor:          pointer;
      transition:      all 0.15s ease;
      -webkit-tap-highlight-color: transparent;

      ion-icon { font-size: 0.85rem; }

      &:focus-visible {
        outline: 2px solid rgba(var(--ham-glow-rgb), 0.55);
        outline-offset: 1px;
      }

      &:active {
        transform: scale(0.93);
      }

      &--done {
        background:   var(--ham-glow-dim);
        border-color: var(--ham-glow);
        color:        var(--ham-glow);
        box-shadow:   0 0 8px rgba(var(--ham-glow-rgb), 0.25);
      }

    }
  `],
  imports: [IonIcon],
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
