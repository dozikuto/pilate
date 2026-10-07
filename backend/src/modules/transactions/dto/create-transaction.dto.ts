import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class CreateTransactionDto {
  @ApiProperty({ example: 'uuid-member' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 2500000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({ example: 2250000 })
  @IsNumber()
  finalAmount: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.COMPLETED })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: 'VNPAY12345678' })
  @IsString()
  @IsOptional()
  referenceCode?: string;

  @ApiPropertyOptional({ example: 'KHUYENMAI10' })
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiProperty({ example: 'uuid-branch' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: 'uuid-package', description: 'If transaction is purchasing a package' })
  @IsString()
  @IsOptional()
  packageId?: string;

  @ApiPropertyOptional({ example: 'Thanh toán gói 10 buổi' })
  @IsString()
  @IsOptional()
  notes?: string;
}
