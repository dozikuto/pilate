import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'PilatesMS - Chi nhánh Quận 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: '02838123456' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'q1@pilatesms.vn' })
  @IsString()
  @IsOptional()
  email?: string;
}

export class CreateRoomDto {
  @ApiProperty({ example: 'Phòng Reformer 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  capacity: number;

  @ApiPropertyOptional({ example: 'Trang bị 8 máy Reformer Allegro 2' })
  @IsString()
  @IsOptional()
  description?: string;
}
