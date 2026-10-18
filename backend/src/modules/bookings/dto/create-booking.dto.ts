import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsUUID,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus } from "../../../common/enums/booking-status.enum";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class BookingQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class CreateBookingDto {
  @ApiProperty({ example: "uuid-schedule" })
  @IsUUID()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ example: "uuid-member" })
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ example: "uuid-member-package" })
  @IsUUID()
  @IsOptional()
  memberPackageId?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  spotNumber?: number;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ example: "Bận việc đột xuất" })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BookPackageSchedulesDto {
  @ApiProperty({ description: "Gói tập đã mua của học viên" })
  @IsUUID()
  memberPackageId: string;

  @ApiProperty({
    type: [String],
    description: "Các buổi học cần đặt cùng một lần",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  scheduleIds: string[];
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
