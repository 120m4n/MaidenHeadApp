import { Injectable, effect, inject } from '@angular/core';
import { SettingsService, ThemeMode } from './settings.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private settings = inject(SettingsService);
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  init(): void {
    // Reaccionar a cambios de tema reactivamente (Angular signals)
    effect(() => {
      this.apply(this.settings.themeMode());
    });

    // Escuchar cambios del sistema cuando está en 'auto'
    this.mediaQuery.addEventListener('change', () => {
      if (this.settings.themeMode() === 'auto') {
        this.apply('auto');
      }
    });
  }

  private apply(mode: ThemeMode): void {
    const doc = document.documentElement;
    doc.classList.remove('ion-palette-dark', 'ion-palette-light');

    if (mode === 'dark') {
      doc.classList.add('ion-palette-dark');
    } else if (mode === 'light') {
      doc.classList.add('ion-palette-light');
    } else {
      // auto: respetar preferencia del sistema
      if (this.mediaQuery.matches) {
        doc.classList.add('ion-palette-dark');
      }
    }
  }
}
