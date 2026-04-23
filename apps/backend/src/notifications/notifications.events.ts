import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsEvents {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('enrollment.created')
  async handleEnrollmentCreated(payload: { userId: string; courseName: string }) {
    await this.notificationsService.onEnrollmentCreated(payload.userId, payload.courseName);
  }

  @OnEvent('credential.issued')
  async handleCredentialIssued(payload: { userId: string; courseName: string }) {
    await this.notificationsService.onCredentialIssued(payload.userId, payload.courseName);
  }

  @OnEvent('progress.completed')
  async handleProgressCompleted(payload: { userId: string; courseName: string }) {
    await this.notificationsService.onProgressCompleted(payload.userId, payload.courseName);
  }
}
