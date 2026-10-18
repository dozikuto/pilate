import { IsOptional, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PackagePreferencesDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "User ID của HLV ưu tiên; null để bỏ ưu tiên",
  })
  @IsOptional()
  @IsUUID()
  preferredInstructorId?: string | null;
}

export class MemberPackageSettingsDto extends PackagePreferencesDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "Gói 1:2 của học viên tập cùng; null để bỏ ghép đôi",
  })
  @IsOptional()
  @IsUUID()
  duoPartnerPackageId?: string | null;
}
