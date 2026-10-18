import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberAddress1792285200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "address" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "members" DROP COLUMN IF EXISTS "address"');
  }
}
