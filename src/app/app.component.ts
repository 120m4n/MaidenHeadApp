import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular/standalone';
import { PwaUpdateService } from './services/pwa-update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastController = inject(ToastController);
  private readonly pwaUpdateService = inject(PwaUpdateService);

  private updateToastVisible = false;

  constructor() {
    this.pwaUpdateService.init();

    this.pwaUpdateService.updateReady$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.presentUpdateToast();
      });
  }

  private async presentUpdateToast(): Promise<void> {
    if (this.updateToastVisible) {
      return;
    }

    this.updateToastVisible = true;
    const toast = await this.toastController.create({
      message: 'Nueva version disponible.',
      position: 'bottom',
      color: 'primary',
      buttons: [
        {
          text: 'Actualizar',
          handler: async () => {
            try {
              await this.pwaUpdateService.applyUpdateAndReload();
            } catch (error) {
              console.error('Failed to apply PWA update:', error);
              await this.presentUpdateFailedToast();
            }
          },
        },
        {
          text: 'Mas tarde',
          role: 'cancel',
        },
      ],
    });

    toast.onDidDismiss().then(() => {
      this.updateToastVisible = false;
    });

    await toast.present();
  }

  private async presentUpdateFailedToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'No se pudo actualizar. Intenta de nuevo.',
      duration: 3000,
      position: 'bottom',
      color: 'warning',
    });

    await toast.present();
  }
}
