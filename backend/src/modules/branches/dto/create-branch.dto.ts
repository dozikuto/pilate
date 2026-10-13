import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RoomType, RoomStatus } from "../../../entities/room.entity";

export class CreateBranchDto {
  @ApiProperty({ example: "PilatesMS - Chi nhánh Quận 1" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM",
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: "02838123456" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "q1@pilatesms.vn" })
  @IsString()
  @IsOptional()
  email?: string;
}

export class CreateRoomDto {
  @ApiPropertyOptional({ example: "uuid-branch" })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: "Phòng VIP 1:1 Cadillac & Reformer" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: RoomType, default: RoomType.PRIVATE_1V1 })
  @IsEnum(RoomType)
  @IsOptional()
  roomType?: RoomType;

  @ApiProperty({
    example: 1,
    description:
      "Số lượng người tập tối đa (1 cho 1vs1, 2 cho 1vs2, 3 cho 1vs3, 4 cho 1vs4...)",
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.AVAILABLE })
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: "Máy Reformer, Cadillac, Ghế Wunda, Gương soi toàn thân",
  })
  @IsString()
  @IsOptional()
  amenities?: string;

  @ApiPropertyOptional({
    example: "Phòng tập riêng tư cao cấp dành cho học viên tập 1 kèm 1 với HLV",
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: "uuid-branch" })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: "Phòng VIP 1:1 Cadillac & Reformer" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: RoomType })
  @IsEnum(RoomType)
  @IsOptional()
  roomType?: RoomType;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: "Máy Reformer, Cadillac, Ghế Wunda, Gương soi toàn thân",
  })
  @IsString()
  @IsOptional()
  amenities?: string;

  @ApiPropertyOptional({ example: "Phòng tập riêng tư cao cấp" })
  @IsString()
  @IsOptional()
  description?: string;
}
