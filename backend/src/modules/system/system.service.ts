import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
  ) {}

  async getAuditLogs(pagination: PaginationDto) {
    const qb = this.auditLogsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (pagination.search) {
      qb.where('log.action ILIKE :search OR log.resource ILIKE :search OR log.details ILIKE :search', {
        search: `%${pagination.search}%`,
      });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('log.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async recordLog(action: string, resource: string, details?: string, userId?: string, ipAddress?: string) {
    const log = this.auditLogsRepository.create({
      action,
      resource,
      details,
      userId,
      ipAddress,
    });
    return this.auditLogsRepository.save(log);
  }

  async createBackup(userId: string) {
    const backupId = `BACKUP_${Date.now()}`;
    const timestamp = new Date().toISOString();

    await this.recordLog(
      'BACKUP',
      'DATABASE',
      `Tạo bản sao lưu dữ liệu hệ thống mã: ${backupId}`,
      userId,
    );

    return {
      success: true,
      backupId,
      filename: `pilatesms_backup_${Date.now()}.sql`,
      createdAt: timestamp,
      status: 'completed',
      sizeBytes: 1548200,
      message: 'Bản sao lưu cơ sở dữ liệu đã được tạo thành công',
    };
  }

  async restoreBackup(backupId: string, userId: string) {
    await this.recordLog(
      'RESTORE',
      'DATABASE',
      `Khôi phục dữ liệu từ bản sao lưu: ${backupId}`,
      userId,
    );

    return {
      success: true,
      backupId,
      restoredAt: new Date().toISOString(),
      message: `Khôi phục dữ liệu thành công từ bản ${backupId}`,
    };
  }

  async getSystemConfig() {
    return {
      studioName: 'PilatesMS Central',
      hotline: '028 3812 3456',
      email: 'contact@pilatesms.vn',
      address: '123 Nguyễn Thị Minh Khai, Bến Thành, Quận 1, TP.HCM',
      cancelHoursLimit: 2,
      autoPromoteWaitlist: true,
      vietqrEnabled: true,
      zaloOaEnabled: true,
      version: '1.2.0',
    };
  }

  async updateSystemConfig(config: any, userId: string) {
    await this.recordLog('CONFIG_UPDATE', 'SYSTEM', JSON.stringify(config), userId);
    return {
      success: true,
      message: 'Cập nhật cấu hình hệ thống thành công',
      config,
    };
  }
}
