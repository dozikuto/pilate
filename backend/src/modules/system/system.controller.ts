import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('System')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Xem nhật ký hệ thống (R7.5)' })
  getLogs(@Query() pagination: PaginationDto) {
    return this.systemService.getAuditLogs(pagination);
  }

  @Post('backup')
  @ApiOperation({ summary: 'Tạo bản sao lưu dữ liệu hệ thống (R7.6)' })
  createBackup(@CurrentUser('id') userId: string) {
    return this.systemService.createBackup(userId);
  }

  @Post('restore/:backupId')
  @ApiOperation({ summary: 'Khôi phục dữ liệu từ bản sao lưu (R7.7)' })
  restoreBackup(
    @Param('backupId') backupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.systemService.restoreBackup(backupId, userId);
  }

  @Get('config')
  @ApiOperation({ summary: 'Xem cấu hình hệ thống (R7.4)' })
  getConfig() {
    return this.systemService.getSystemConfig();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống (R7.4)' })
  updateConfig(
    @Body() config: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.systemService.updateSystemConfig(config, userId);
  }
}
