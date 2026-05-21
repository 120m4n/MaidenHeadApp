import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy, provideRouter,
  withPreloading, PreloadAllModules,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { SettingsService } from './app/services/settings.service';
import { ThemeService } from './app/services/theme.service';
import { QsoLogService } from './app/services/qso-log.service';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}).then(async appRef => {
  // Inicializar servicios que necesitan carga async antes del primer render
  const settings = appRef.injector.get(SettingsService);
  const theme = appRef.injector.get(ThemeService);
  const qsoLog = appRef.injector.get(QsoLogService);

  await settings.init();
  await qsoLog.init();
  theme.init(); // usa effect() reactivo — no async
}).catch(err => console.error('Bootstrap error:', err));
