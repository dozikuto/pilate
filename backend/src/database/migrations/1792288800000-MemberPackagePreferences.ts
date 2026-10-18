import { MigrationInterface, QueryRunner } from "typeorm";

export class MemberPackagePreferences1792288800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE member_packages ADD COLUMN IF NOT EXISTS preferred_instructor_id uuid REFERENCES users(id) ON DELETE SET NULL",
    );
    await queryRunner.query(
      "ALTER TABLE member_packages ADD COLUMN IF NOT EXISTS duo_partner_package_id uuid REFERENCES member_packages(id) ON DELETE SET NULL",
    );
    await queryRunner.query(
      "ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS member_package_id uuid REFERENCES member_packages(id) ON DELETE SET NULL",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE check_ins DROP COLUMN IF EXISTS member_package_id",
    );
    await queryRunner.query(
      "ALTER TABLE member_packages DROP COLUMN IF EXISTS duo_partner_package_id",
    );
    await queryRunner.query(
      "ALTER TABLE member_packages DROP COLUMN IF EXISTS preferred_instructor_id",
    );
  }
}
