import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "../../entities/audit-log.entity";
import { SystemSetting } from "../../entities/system-setting.entity";
import { SystemService } from "./system.service";
import { SystemController } from "./system.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, SystemSetting])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
