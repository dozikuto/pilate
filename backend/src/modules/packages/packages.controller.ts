import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto, AssignPackageDto } from './dto/create-package.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { MemberPackageSettingsService } from './member-package-settings.service';
import { MemberPackageSettingsDto } from './dto/member-package-settings.dto';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService, private readonly settings: MemberPackageSettingsService) {}

  @Post('starter-catalog')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  prepareCatalog() {
    return this.packagesService.prepareCatalog();
  }

  @Get('member-packages/:id/duo-options')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  partnerOptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.settings.partnerOptions(id);
  }

  @Patch('member-packages/:id/settings')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  updateSettings(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MemberPackageSettingsDto) {
    return this.settings.update(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all packages' })
  findAll(@Query() pagination: PaginationDto) {
    return this.packagesService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package details' })
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new package' })
  create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update package' })
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate package' })
  remove(@Param('id') id: string) {
    return this.packagesService.remove(id);
  }

  @Post('assign')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Assign package to member' })
  assign(@Body() dto: AssignPackageDto) {
    return this.packagesService.assignToMember(dto);
  }

  @Get('member/:memberId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get packages of a specific member' })
  findMemberPackages(@Param('memberId') memberId: string) {
    return this.packagesService.findMemberPackages(memberId);
  }
}
