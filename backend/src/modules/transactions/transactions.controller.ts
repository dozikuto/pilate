import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import {
  CreateTransactionDto,
  TransactionQueryDto,
} from "./dto/create-transaction.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaymentStatus } from "../../common/enums/payment-status.enum";

@ApiTags("Transactions")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MEMBER)
  @ApiOperation({ summary: "Get transactions" })
  @ApiQuery({ name: "status", enum: PaymentStatus, required: false })
  @ApiQuery({ name: "memberId", required: false })
  findAll(
    @CurrentUser() currentUser: any,
    @Query() pagination: TransactionQueryDto,
    @Query("status") status?: PaymentStatus,
    @Query("memberId") memberId?: string,
  ) {
    return this.transactionsService.findAll(
      pagination,
      status,
      memberId,
      currentUser,
    );
  }

  @Get("stats")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get revenue statistics" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  getStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.transactionsService.getRevenueStats(startDate, endDate);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get transaction details" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.transactionsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Create a transaction" })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser("id") currentUserId: string,
  ) {
    return this.transactionsService.create(dto, currentUserId);
  }

  @Post(":id/confirm")
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Confirm manual payment" })
  confirm(
    @Param("id") id: string,
    @Body("referenceCode") referenceCode?: string,
    @CurrentUser("id") currentUserId?: string,
  ) {
    return this.transactionsService.confirmPayment(
      id,
      referenceCode,
      currentUserId,
    );
  }
}
