import { Injectable, Injector, effect, inject, runInInjectionContext } from '@angular/core';
import { SettingsService, ThemeMode } from './settings.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private settings   = inject(SettingsService);
  private injector   = inject(Injector);           // guardado en construction context
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  init(): void {
    // 1. Aplicar inmediatamente con el valor ya cargado de storage
    this.apply(this.settings.themeMode());

    // 2. Reaccionar a cambios futuros del signal.
    //    effect() necesita injection context — usamos el injector guardado.
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.apply(this.settings.themeMode());
      });
    });

    // 3. Reaccionar a cambios del sistema cuando el modo es 'auto'
    this.mediaQuery.addEventListener('change', () => {
      if (this.settings.themeMode() === 'auto') {
        this.apply('auto');
      }
    });
  }

  /**
   * Establece el atributo `data-theme` en <html>.
   * Las variables CSS de variables.scss reaccionan al selector [data-theme="dark"].
   * En modo "auto" se quita el atributo y la media query del CSS toma el control.
   */
  private apply(mode: ThemeMode): void {
    const doc = document.documentElement;

    if (mode === 'dark') {
      doc.setAttribute('data-theme', 'dark');
    } else if (mode === 'light') {
      doc.setAttribute('data-theme', 'light');
    } else {
      // auto: sin atributo → la @media query de variables.scss decide
      doc.removeAttribute('data-theme');
    }
  }
}
