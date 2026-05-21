import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonAlert,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline, trashOutline, informationCircleOutline,
  radioOutline, calendarOutline, timeOutline,
} from 'ionicons/icons';

import { QsoLogService } from '../../services/qso-log.service';
import { SettingsService } from '../../services/settings.service';
import { QsoEntry } from '../../models/qso-entry.model';

@Component({
  selector: 'app-qso-log',
  templateUrl: 'qso-log.page.html',
  styleUrls: ['qso-log.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonAlert,
  ],
})
export class QsoLogPage {
  qsoLog = inject(QsoLogService);
  private settings = inject(SettingsService);

  showClearAlert = signal(false);
  exporting = signal(false);

  readonly alertButtons = [
    { text: 'Cancelar', role: 'cancel' },
    { text: 'Borrar todo', role: 'destructive', handler: () => this.clearAll() },
  ];

  constructor() {
    addIcons({ downloadOutline, trashOutline, informationCircleOutline, radioOutline, calendarOutline, timeOutline });
  }

  formatDate(qsoDate: string): string {
    if (qsoDate.length !== 8) return qsoDate;
    return `${qsoDate.substring(6, 8)}/${qsoDate.substring(4, 6)}/${qsoDate.substring(0, 4)}`;
  }

  formatTime(timeOn: string): string {
    if (timeOn.length < 4) return timeOn;
    return `${timeOn.substring(0, 2)}:${timeOn.substring(2, 4)}Z`;
  }

  distanceLabel(entry: QsoEntry): string {
    if (!entry.distanceKm) return '';
    const unit = this.settings.distanceUnit();
    if (unit === 'nm') return `${Math.round(entry.distanceKm * 0.539957)} NM`;
    return `${entry.distanceKm} km`;
  }

  async remove(id: string): Promise<void> {
    await this.qsoLog.remove(id);
  }

  async export(): Promise<void> {
    if (this.qsoLog.entries().length === 0) return;
    this.exporting.set(true);
    try {
      await this.qsoLog.exportAdif();
    } finally {
      this.exporting.set(false);
    }
  }

  async clearAll(): Promise<void> {
    await this.qsoLog.clear();
    this.showClearAlert.set(false);
  }
}
