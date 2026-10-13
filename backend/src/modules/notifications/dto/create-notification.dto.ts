import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '../../../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID of recipient' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Title of the notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.SYSTEM })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.PUSH })
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel;
}

export class BroadcastMaintenanceDto {
  @ApiProperty({ description: 'Maintenance notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Maintenance message content' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Equipment name' })
  @IsString()
  @IsOptional()
  equipmentName?: string;
}
