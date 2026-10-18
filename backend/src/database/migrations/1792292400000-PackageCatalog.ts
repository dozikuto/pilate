import { MigrationInterface, QueryRunner } from 'typeorm';

export class PackageCatalog1792292400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS catalog_code varchar');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS packages_catalog_code_unique ON packages(catalog_code)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS packages_catalog_code_unique');
    await queryRunner.query('ALTER TABLE packages DROP COLUMN IF EXISTS catalog_code');
  }
}
