import { IsOptional, IsInt, IsString, IsIn, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationDto {
  @ApiPropertyOptional({ description: "Page number", default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Sort field" })
  @IsOptional()
  @IsIn([
    "createdAt",
    "updatedAt",
    "fullName",
    "name",
    "email",
    "bookedAt",
    "checkInTime",
  ])
  sort?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  order?: "ASC" | "DESC" = "DESC";

  @ApiPropertyOptional({ description: "Search keyword" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter status" })
  @IsOptional()
  @IsString()
  status?: string;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  dto: PaginationDto,
): PaginatedResult<T> {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? 20;
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
