import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly updateReadySubject = new Subject<void>();
  private readonly seenVersionHashes = new Set<string>();

  private initialized = false;

  readonly updateReady$ = this.updateReadySubject.asObservable();

  init(): void {
    if (this.initialized || !this.swUpdate.isEnabled) {
      return;
    }

    this.initialized = true;

    this.swUpdate.versionUpdates.subscribe({
      next: event => this.handleVersionEvent(event),
      error: error => {
        console.error('PWA update stream error:', error);
      },
    });

    void this.swUpdate.checkForUpdate().catch(error => {
      console.warn('Initial PWA update check failed:', error);
    });
  }

  async applyUpdateAndReload(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    await this.swUpdate.activateUpdate();
    window.location.reload();
  }

  private handleVersionEvent(event: VersionEvent): void {
    if (event.type !== 'VERSION_READY') {
      if (event.type === 'VERSION_INSTALLATION_FAILED') {
        console.error('PWA update installation failed:', event.error);
      }
      return;
    }

    const hash = (event as VersionReadyEvent).latestVersion.hash;
    if (this.seenVersionHashes.has(hash)) {
      return;
    }

    this.seenVersionHashes.add(hash);
    this.updateReadySubject.next();
  }
}