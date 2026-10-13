import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { SystemSetting } from "../../entities/system-setting.entity";
import { UpdateSystemConfigDto } from "./dto/system-config.dto";
import { AuditLog } from "../../entities/audit-log.entity";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";

@Injectable()
export class SystemService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
  ) {}

  async getAuditLogs(pagination: PaginationDto) {
    const qb = this.auditLogsRepository
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user");

    if (pagination.search) {
      qb.where(
        "log.action ILIKE :search OR log.resource ILIKE :search OR log.details ILIKE :search",
        {
          search: `%${pagination.search}%`,
        },
      );
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy("log.createdAt", pagination.order || "DESC");

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async recordLog(
    action: string,
    resource: string,
    details?: string,
    userId?: string,
    ipAddress?: string,
  ) {
    const log = this.auditLogsRepository.create({
      action,
      resource,
      details,
      userId,
      ipAddress,
    });
    return this.auditLogsRepository.save(log);
  }

  private get backupDirectory() {
    const db = String(this.dataSource.options.database).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    return path.resolve(
      process.env.QA_STORAGE_DIR || path.resolve(__dirname, "../../../backups"),
      db,
    );
  }

  private backupPath(backupId: string) {
    if (!/^BACKUP_[a-f0-9-]{36}$/i.test(backupId))
      throw new NotFoundException("Bản sao lưu không tồn tại");
    return path.join(this.backupDirectory, backupId + ".json");
  }

  async getBackupFilePath(backupId: string) {
    const filePath = this.backupPath(backupId);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException("Bản sao lưu không tồn tại");
    }
    return filePath;
  }

  async listBackups() {
    let files: string[];
    try {
      files = await fs.readdir(this.backupDirectory);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const result = [];
    for (const filename of files.filter((f) =>
      /^BACKUP_[a-f0-9-]{36}\.json$/i.test(f),
    )) {
      const stat = await fs.stat(path.join(this.backupDirectory, filename));
      result.push({
        backupId: filename.slice(0, -5),
        filename,
        createdAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      });
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createBackup(userId: string) {
    const backupId = "BACKUP_" + randomUUID(),
      createdAt = new Date().toISOString();
    const tables = await this.dataSource.transaction(
      "REPEATABLE READ",
      async (manager) => {
        const result = {};
        for (const meta of this.dataSource.entityMetadatas) {
          result[meta.tableName] = await manager.query(
            'SELECT * FROM "' + meta.tableName.replace(/"/g, '""') + '"',
          );
        }
        return result;
      },
    );
    const data = JSON.stringify({
      version: 1,
      database: this.dataSource.options.database,
      createdAt,
      tables,
    });
    const filePath = this.backupPath(backupId);
    await fs.mkdir(this.backupDirectory, { recursive: true });
    await fs.writeFile(filePath, data, { flag: "wx", mode: 0o600 });
    await this.recordLog(
      "BACKUP",
      "DATABASE",
      "Tạo bản sao lưu " + backupId,
      userId,
    );
    return {
      success: true,
      backupId,
      filename: backupId + ".json",
      filePath,
      createdAt,
      status: "completed",
      sizeBytes: Buffer.byteLength(data),
      message: "Đã tạo bản sao lưu dữ liệu",
    };
  }

  async restoreBackup(backupId: string, userId: string) {
    const filePath = this.backupPath(backupId);
    let snapshot;
    try {
      snapshot = JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT")
        throw new NotFoundException("Bản sao lưu không tồn tại");
      throw new BadRequestException("Bản sao lưu không hợp lệ");
    }
    const metadata = this.dataSource.entityMetadatas;
    if (
      snapshot.version !== 1 ||
      snapshot.database !== this.dataSource.options.database ||
      !snapshot.tables ||
      Object.keys(snapshot.tables).length !== metadata.length
    )
      throw new BadRequestException(
        "Bản sao lưu không thuộc database hoặc phiên bản hiện tại",
      );
    for (const meta of metadata) {
      const columns = meta.columns.map((c) => c.databaseName);
      if (
        !Array.isArray(snapshot.tables[meta.tableName]) ||
        snapshot.tables[meta.tableName].some(
          (row) =>
            !row ||
            Object.keys(row).length !== columns.length ||
            Object.keys(row).some((key) => !columns.includes(key)),
        )
      )
        throw new BadRequestException("Cấu trúc bản sao lưu không khớp");
    }
    const pending = [...metadata],
      ordered = [],
      done = new Set<string>();
    while (pending.length) {
      const index = pending.findIndex((meta) =>
        meta.foreignKeys.every(
          (fk) =>
            fk.referencedEntityMetadata === meta ||
            done.has(fk.referencedEntityMetadata.tableName),
        ),
      );
      if (index < 0)
        throw new BadRequestException(
          "Không thể khôi phục cấu trúc có khóa ngoại vòng",
        );
      const [meta] = pending.splice(index, 1);
      ordered.push(meta);
      done.add(meta.tableName);
    }
    const quote = (name: string) => '"' + name.replace(/"/g, '""') + '"';
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          "TRUNCATE TABLE " +
            metadata.map((meta) => quote(meta.tableName)).join(", ") +
            " RESTART IDENTITY",
        );
        for (const meta of ordered) {
          for (const row of snapshot.tables[meta.tableName]) {
            const columns = Object.keys(row);
            await manager.query(
              "INSERT INTO " +
                quote(meta.tableName) +
                " (" +
                columns.map(quote).join(",") +
                ") VALUES (" +
                columns.map((_, i) => "$" + (i + 1)).join(",") +
                ")",
              columns.map((c) => row[c]),
            );
          }
        }
      });
    } catch {
      throw new BadRequestException(
        "Khôi phục thất bại; dữ liệu hiện tại được giữ nguyên",
      );
    }
    await this.recordLog(
      "RESTORE",
      "DATABASE",
      "Khôi phục bản sao lưu " + backupId,
      userId,
    );
    return {
      success: true,
      backupId,
      restoredAt: new Date().toISOString(),
      message: "Đã khôi phục dữ liệu",
    };
  }

  async getSystemConfig() {
    const stored = await this.dataSource
      .getRepository(SystemSetting)
      .findOneBy({ key: "config" });
    return {
      studioName: "PilatesMS Central",
      hotline: "028 3812 3456",
      email: "contact@pilatesms.vn",
      address: "123 Nguyễn Thị Minh Khai, Bến Thành, Quận 1, TP.HCM",
      cancelHoursLimit: 2,
      autoPromoteWaitlist: true,
      vietqrEnabled: true,
      zaloOaEnabled: true,
      version: "1.2.0",
      ...(stored?.value || {}),
    };
  }

  async updateSystemConfig(config: UpdateSystemConfigDto, userId: string) {
    const value = { ...(await this.getSystemConfig()), ...config };
    await this.dataSource
      .getRepository(SystemSetting)
      .save({ key: "config", value });
    await this.recordLog(
      "CONFIG_UPDATE",
      "SYSTEM",
      JSON.stringify(config),
      userId,
    );
    return {
      success: true,
      message: "Cập nhật cấu hình hệ thống thành công",
      config,
    };
  }
}
