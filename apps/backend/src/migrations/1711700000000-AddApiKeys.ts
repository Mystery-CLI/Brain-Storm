import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddApiKeys1711700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar' },
          { name: 'keyHash', type: 'varchar', isUnique: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'userId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'lastUsedAt', type: 'timestamp', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('api_keys');
  }
}
