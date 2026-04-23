import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddForums1711900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'courseId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' },
          { name: 'isPinned', type: 'boolean', default: false },
          { name: 'answerReplyId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
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

    await queryRunner.createTable(
      new Table({
        name: 'replies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'postId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'content', type: 'text' },
          { name: 'isAnswer', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['postId'],
            referencedTableName: 'posts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
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
    await queryRunner.dropTable('replies');
    await queryRunner.dropTable('posts');
  }
}
