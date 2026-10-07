import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkoutPlanDto {
  @ApiProperty({ example: 'uuid-member' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ example: 'uuid-schedule' })
  @IsString()
  @IsOptional()
  scheduleId?: string;

  @ApiProperty({ example: 'Giáo án Pilates Cột sống & Khớp hông' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: '1. Footwork trên Reformer (10 rep)\n2. Pelvic Curl (8 rep)\n3. Spine Stretch Forward (5 rep)' })
  @IsString()
  @IsOptional()
  exercises?: string;

  @ApiPropertyOptional({ example: 'Học viên giữ form tốt, cần chú ý hơi thở thì thở ra khi gập bụng' })
  @IsString()
  @IsOptional()
  progressNotes?: string;

  @ApiPropertyOptional({ example: 'Về nhà tập bài thở ngực bên và duỗi gân khoeo 10 phút' })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class UpdateProgressDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  progressNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feedback?: string;
}
