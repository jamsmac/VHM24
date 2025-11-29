import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add requires_password_change field to users table
 *
 * REQ-AUTH-31: First Login Password Change
 *
 * Добавляет поле для отслеживания необходимости смены пароля при первом входе.
 * Используется когда администратор создает пользователя с временным паролем.
 */
export class AddRequiresPasswordChangeToUsers1732000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'requires_password_change',
        type: 'boolean',
        default: false,
        isNullable: false,
        comment:
          'Флаг необходимости смены пароля при следующем входе (используется для новых пользователей)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'requires_password_change');
  }
}
