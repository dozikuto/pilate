import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationChannel } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { CreateNotificationDto, BroadcastMaintenanceDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getMyNotifications(userId: string, limit = 20) {
    const list = await this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return list;
  }

  async markAsRead(id: string, userId: string) {
    const noti = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!noti) {
      throw new NotFoundException('Thông báo không tồn tại');
    }
    noti.isRead = true;
    return this.notificationsRepository.save(noti);
  }

  async markAllAsRead(userId: string) {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  async create(dto: CreateNotificationDto) {
    const notification = this.notificationsRepository.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.SYSTEM,
      channel: dto.channel || NotificationChannel.PUSH,
      isRead: false,
      sentAt: new Date(),
    });
    return this.notificationsRepository.save(notification);
  }

  async broadcastMaintenance(dto: BroadcastMaintenanceDto) {
    // Lấy tất cả người dùng trong hệ thống (members, receptionists, instructors)
    const users = await this.usersRepository.find({
      select: ['id'],
      where: { isActive: true },
    });

    if (!users || users.length === 0) {
      return { count: 0 };
    }

    const notifications = users.map((u) =>
      this.notificationsRepository.create({
        userId: u.id,
        title: dto.title || `Bảo trì thiết bị: ${dto.equipmentName || 'Pilates'}`,
        message: dto.message,
        type: NotificationType.ALERT,
        channel: NotificationChannel.PUSH,
        isRead: false,
        sentAt: new Date(),
      }),
    );

    // Save in batches of 100
    const chunkSize = 100;
    for (let i = 0; i < notifications.length; i += chunkSize) {
      const chunk = notifications.slice(i, i + chunkSize);
      await this.notificationsRepository.save(chunk);
    }

    return {
      success: true,
      message: `Đã phát thông báo bảo trì tới ${users.length} người dùng`,
      count: users.length,
    };
  }
}
