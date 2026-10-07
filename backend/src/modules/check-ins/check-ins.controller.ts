import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CheckInsService } from './check-ins.service';
import { QrCheckInDto, ManualCheckInDto } from './dto/check-in.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Check-ins')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('check-ins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get all check-in history' })
  @ApiQuery({ name: 'memberId', required: false })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('memberId') memberId?: string,
  ) {
    return this.checkInsService.findAll(pagination, memberId);
  }

  @Post('qr')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Check-in using QR Code' })
  qrCheckIn(
    @Body() dto: QrCheckInDto,
    @CurrentUser('id') processorId: string,
  ) {
    return this.checkInsService.qrCheckIn(dto, processorId);
  }

  @Post('manual')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Manual check-in by receptionist' })
  manualCheckIn(
    @Body() dto: ManualCheckInDto,
    @CurrentUser('id') processorId: string,
  ) {
    return this.checkInsService.manualCheckIn(dto, processorId);
  }
}
