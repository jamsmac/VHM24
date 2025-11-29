import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add IP Whitelist fields to users table
 *
 * REQ-AUTH-60: IP Whitelist для админов
 *
 * Добавляет поля для управления IP Whitelist:
 * - ip_whitelist_enabled: включение/отключение whitelist
 * - allowed_ips: список разрешенных IP-адресов
 */
export class AddIpWhitelistToUsers1732000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ip_whitelist_enabled column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'ip_whitelist_enabled',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Add allowed_ips column (array of IP addresses)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'allowed_ips',
        type: 'text',
        isNullable: true,
        comment: 'Comma-separated list of allowed IP addresses',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'allowed_ips');
    await queryRunner.dropColumn('users', 'ip_whitelist_enabled');
  }
}
