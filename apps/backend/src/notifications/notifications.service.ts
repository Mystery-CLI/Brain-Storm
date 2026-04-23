import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway
  ) {}

  async create(userId: string, type: NotificationType, message: string) {
    const notification = this.repo.create({ userId, type, message });
    const saved = await this.repo.save(notification);
    this.gateway.emitToUser(userId, 'notification', saved);
    return saved;
  }

  async findByUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { isRead: 'ASC', createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.isRead = true;
    return this.repo.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  // Event handlers for automatic notifications
  async onEnrollmentCreated(userId: string, courseName: string) {
    return this.create(
      userId,
      NotificationType.ENROLLMENT,
      `You have been enrolled in ${courseName}`
    );
  }

  async onCredentialIssued(userId: string, courseName: string) {
    return this.create(
      userId,
      NotificationType.CREDENTIAL_ISSUED,
      `Your credential for ${courseName} has been issued!`
    );
  }

  async onProgressCompleted(userId: string, courseName: string) {
    return this.create(
      userId,
      NotificationType.COMPLETION,
      `Congratulations! You have completed ${courseName}`
    );
  }
}
