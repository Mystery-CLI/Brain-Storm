import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferrals1714000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "referralCode" varchar UNIQUE`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "referredBy" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referredBy"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referralCode"`);
  }
}
