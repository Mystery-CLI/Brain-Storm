import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
          },
          {
            name: 'stellarPublicKey',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'varchar',
            default: "'student'",
          },
          {
            name: 'isBanned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create courses table
    await queryRunner.createTable(
      new Table({
        name: 'courses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'level',
            type: 'varchar',
            default: "'beginner'",
          },
          {
            name: 'durationHours',
            type: 'int',
            default: 0,
          },
          {
            name: 'isPublished',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create notifications table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['enrollment', 'completion', 'credential_issued'],
          },
          {
            name: 'message',
            type: 'varchar',
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
    await queryRunner.dropTable('courses');
    await queryRunner.dropTable('users');
  }
}
