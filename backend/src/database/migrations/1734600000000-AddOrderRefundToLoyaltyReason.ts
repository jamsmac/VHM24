import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds 'order_refund' value to loyalty_transaction_reason_enum.
 * This is needed to track points that are refunded when an order is cancelled.
 */
export class AddOrderRefundToLoyaltyReason1734600000000 implements MigrationInterface {
  name = 'AddOrderRefundToLoyaltyReason1734600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum value for order refunds
    // Using ALTER TYPE ... ADD VALUE which is safe and doesn't require recreating the type
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "loyalty_transaction_reason_enum" ADD VALUE IF NOT EXISTS 'order_refund' AFTER 'order_redeemed';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // The value will remain but won't be used if the code is reverted
    // This is safe as unused enum values don't affect functionality
  }
}
