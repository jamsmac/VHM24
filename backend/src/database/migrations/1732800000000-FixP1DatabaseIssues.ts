import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('FixP1DatabaseIssues1732800000000');

/**
 * Migration: Fix P1 Database Issues
 *
 * Addresses P1 (High Priority) issues from database analysis:
 * 1. Add missing ON DELETE behaviors to foreign keys
 * 2. Add missing indexes for FK columns
 * 3. Add composite indexes for common query patterns
 * 4. Add missing unique constraints
 */
export class FixP1DatabaseIssues1732800000000 implements MigrationInterface {
  name = 'FixP1DatabaseIssues1732800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔧 Fixing P1 database issues...');

    // ============================================================================
    // 1. ADD MISSING ON DELETE BEHAVIORS TO FOREIGN KEYS
    // ============================================================================
    logger.log('  🔗 Adding ON DELETE behaviors to foreign keys...');

    // Helper to safely update FK constraint
    const updateForeignKey = async (
      table: string,
      constraintName: string,
      column: string,
      refTable: string,
      refColumn: string,
      onDelete: string,
    ) => {
      // Check if table exists
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${table}'
        );
      `);

      if (!tableExists[0]?.exists) {
        logger.log(`    ⚠️ Table ${table} does not exist, skipping`);
        return;
      }

      // Check if column exists
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'
        );
      `);

      if (!columnExists[0]?.exists) {
        logger.log(`    ⚠️ Column ${table}.${column} does not exist, skipping`);
        return;
      }

      // Check if ref table exists
      const refTableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${refTable}'
        );
      `);

      if (!refTableExists[0]?.exists) {
        logger.log(`    ⚠️ Reference table ${refTable} does not exist, skipping`);
        return;
      }

      // Drop existing constraint if exists
      await queryRunner.query(`
        ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraintName}";
      `);

      // Add new constraint with ON DELETE
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "${constraintName}"
        FOREIGN KEY ("${column}")
        REFERENCES "${refTable}"("${refColumn}")
        ON DELETE ${onDelete};
      `);

      logger.log(`    ✅ ${table}.${column} -> ON DELETE ${onDelete}`);
    };

    // Routes: driver_id -> users (RESTRICT)
    await updateForeignKey('routes', 'FK_routes_driver', 'driver_id', 'users', 'id', 'RESTRICT');

    // Invoices: customer_id -> users (RESTRICT)
    await updateForeignKey(
      'invoices',
      'FK_invoices_customer',
      'customer_id',
      'users',
      'id',
      'RESTRICT',
    );

    // Payments: invoice_id -> invoices (SET NULL)
    await updateForeignKey(
      'payments',
      'FK_payments_invoice',
      'invoice_id',
      'invoices',
      'id',
      'SET NULL',
    );

    // SalesImports: uploaded_by_user_id -> users (SET NULL)
    await updateForeignKey(
      'sales_imports',
      'FK_sales_imports_uploaded_by',
      'uploaded_by_user_id',
      'users',
      'id',
      'SET NULL',
    );

    // TelegramUsers: user_id -> users (CASCADE)
    await updateForeignKey(
      'telegram_users',
      'FK_telegram_users_user',
      'user_id',
      'users',
      'id',
      'CASCADE',
    );

    // Employees: department_id -> departments (RESTRICT)
    await updateForeignKey(
      'employees',
      'FK_employees_department',
      'department_id',
      'departments',
      'id',
      'RESTRICT',
    );

    // Employees: position_id -> positions (RESTRICT)
    await updateForeignKey(
      'employees',
      'FK_employees_position',
      'position_id',
      'positions',
      'id',
      'RESTRICT',
    );

    // Employees: manager_id -> employees (SET NULL)
    await updateForeignKey(
      'employees',
      'FK_employees_manager',
      'manager_id',
      'employees',
      'id',
      'SET NULL',
    );

    // Employees: user_id -> users (SET NULL)
    await updateForeignKey('employees', 'FK_employees_user', 'user_id', 'users', 'id', 'SET NULL');

    // Attendances: employee_id -> employees (CASCADE)
    await updateForeignKey(
      'attendances',
      'FK_attendances_employee',
      'employee_id',
      'employees',
      'id',
      'CASCADE',
    );

    // LeaveRequests: employee_id -> employees (CASCADE)
    await updateForeignKey(
      'leave_requests',
      'FK_leave_requests_employee',
      'employee_id',
      'employees',
      'id',
      'CASCADE',
    );

    // LeaveRequests: approved_by_id -> users (SET NULL)
    await updateForeignKey(
      'leave_requests',
      'FK_leave_requests_approved_by',
      'approved_by_id',
      'users',
      'id',
      'SET NULL',
    );

    // WarehouseZones: warehouse_id -> warehouses (CASCADE)
    await updateForeignKey(
      'warehouse_zones',
      'FK_warehouse_zones_warehouse',
      'warehouse_id',
      'warehouses',
      'id',
      'CASCADE',
    );

    // Warehouses: location_id -> locations (SET NULL)
    await updateForeignKey(
      'warehouses',
      'FK_warehouses_location',
      'location_id',
      'locations',
      'id',
      'SET NULL',
    );

    // Warehouses: manager_id -> users (SET NULL)
    await updateForeignKey(
      'warehouses',
      'FK_warehouses_manager',
      'manager_id',
      'users',
      'id',
      'SET NULL',
    );

    // Departments: manager_id -> users (SET NULL)
    await updateForeignKey(
      'departments',
      'FK_departments_manager',
      'manager_id',
      'users',
      'id',
      'SET NULL',
    );

    // Departments: parent_department_id -> departments (SET NULL)
    await updateForeignKey(
      'departments',
      'FK_departments_parent',
      'parent_department_id',
      'departments',
      'id',
      'SET NULL',
    );

    // CommissionCalculations: contract_id -> contracts (RESTRICT)
    await updateForeignKey(
      'commission_calculations',
      'FK_commission_calculations_contract',
      'contract_id',
      'contracts',
      'id',
      'RESTRICT',
    );

    // ============================================================================
    // 2. ADD MISSING INDEXES FOR FK COLUMNS
    // ============================================================================
    logger.log('  📊 Adding missing indexes for FK columns...');

    const createIndexIfNotExists = async (
      indexName: string,
      table: string,
      columns: string[],
      where?: string,
    ) => {
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${table}'
        );
      `);

      if (!tableExists[0]?.exists) {
        logger.log(`    ⚠️ Table ${table} does not exist, skipping index`);
        return;
      }

      const columnsStr = columns.map((c) => `"${c}"`).join(', ');
      const whereClause = where ? ` WHERE ${where}` : '';

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "${indexName}"
        ON "${table}" (${columnsStr})${whereClause};
      `);
      logger.log(`    ✅ Index ${indexName} on ${table}(${columns.join(', ')})`);
    };

    // Routes indexes
    await createIndexIfNotExists('idx_routes_driver_id', 'routes', ['driver_id']);

    // Invoices indexes
    await createIndexIfNotExists('idx_invoices_customer_id', 'invoices', ['customer_id']);

    // Payments indexes
    await createIndexIfNotExists('idx_payments_invoice_id', 'payments', ['invoice_id']);

    // Employees indexes
    await createIndexIfNotExists('idx_employees_department_id', 'employees', ['department_id']);
    await createIndexIfNotExists('idx_employees_position_id', 'employees', ['position_id']);
    await createIndexIfNotExists('idx_employees_manager_id', 'employees', ['manager_id']);
    await createIndexIfNotExists('idx_employees_user_id', 'employees', ['user_id']);

    // Attendances indexes
    await createIndexIfNotExists('idx_attendances_employee_id', 'attendances', ['employee_id']);

    // LeaveRequests indexes
    await createIndexIfNotExists('idx_leave_requests_employee_id', 'leave_requests', [
      'employee_id',
    ]);
    await createIndexIfNotExists('idx_leave_requests_approved_by_id', 'leave_requests', [
      'approved_by_id',
    ]);

    // Departments indexes
    await createIndexIfNotExists('idx_departments_manager_id', 'departments', ['manager_id']);
    await createIndexIfNotExists('idx_departments_parent_id', 'departments', [
      'parent_department_id',
    ]);

    // TelegramUsers indexes
    await createIndexIfNotExists('idx_telegram_users_user_id', 'telegram_users', ['user_id']);

    // SalesImports indexes
    await createIndexIfNotExists('idx_sales_imports_uploaded_by', 'sales_imports', [
      'uploaded_by_user_id',
    ]);

    // WarehouseZones indexes
    await createIndexIfNotExists('idx_warehouse_zones_warehouse_id', 'warehouse_zones', [
      'warehouse_id',
    ]);

    // CommissionCalculations indexes
    await createIndexIfNotExists('idx_commission_calcs_contract_id', 'commission_calculations', [
      'contract_id',
    ]);

    // ============================================================================
    // 3. ADD COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
    // ============================================================================
    logger.log('  📈 Adding composite indexes for common queries...');

    // Employees: active employees by department
    await createIndexIfNotExists('idx_employees_status_dept', 'employees', [
      'employment_status',
      'department_id',
    ]);

    // Attendances: employee attendance by date
    await createIndexIfNotExists('idx_attendances_employee_date', 'attendances', [
      'employee_id',
      'date',
    ]);

    // LeaveRequests: pending leaves by employee
    await createIndexIfNotExists('idx_leave_requests_employee_status', 'leave_requests', [
      'employee_id',
      'status',
    ]);

    // Invoices: customer invoices by status
    await createIndexIfNotExists('idx_invoices_customer_status', 'invoices', [
      'customer_id',
      'status',
    ]);

    // Payments: daily payment reports
    await createIndexIfNotExists('idx_payments_date_status', 'payments', [
      'payment_date',
      'status',
    ]);

    // ============================================================================
    // 4. ADD MISSING UNIQUE CONSTRAINTS
    // ============================================================================
    logger.log('  🔒 Adding unique constraints...');

    // Unique attendance per employee per day
    const attendanceConstraintExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_attendances_employee_date'
        AND table_name = 'attendances'
      );
    `);

    if (!attendanceConstraintExists[0]?.exists) {
      const attendancesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'attendances'
        );
      `);

      if (attendancesExists[0]?.exists) {
        await queryRunner.query(`
          ALTER TABLE "attendances"
          ADD CONSTRAINT "uq_attendances_employee_date"
          UNIQUE ("employee_id", "date");
        `);
        logger.log('    ✅ Unique constraint on attendances(employee_id, date)');
      }
    }

    // Unique telegram link per user
    const telegramConstraintExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_telegram_users_user_id'
        AND table_name = 'telegram_users'
      );
    `);

    if (!telegramConstraintExists[0]?.exists) {
      const telegramUsersExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'telegram_users'
        );
      `);

      if (telegramUsersExists[0]?.exists) {
        // Check if there are duplicates before adding constraint
        const duplicates = await queryRunner.query(`
          SELECT user_id, COUNT(*) as cnt
          FROM telegram_users
          WHERE user_id IS NOT NULL
          GROUP BY user_id
          HAVING COUNT(*) > 1;
        `);

        if (duplicates.length === 0) {
          await queryRunner.query(`
            ALTER TABLE "telegram_users"
            ADD CONSTRAINT "uq_telegram_users_user_id"
            UNIQUE ("user_id");
          `);
          logger.log('    ✅ Unique constraint on telegram_users(user_id)');
        } else {
          logger.log('    ⚠️ Cannot add unique constraint on telegram_users - duplicates exist');
        }
      }
    }

    logger.log('');
    logger.log('✅ All P1 database issues fixed!');
    logger.log('');
    logger.log('📋 Summary:');
    logger.log('  - ON DELETE behaviors added to foreign keys');
    logger.log('  - Missing FK indexes created');
    logger.log('  - Composite indexes for common queries added');
    logger.log('  - Unique constraints added where applicable');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔄 Reverting P1 database fixes...');

    // Drop unique constraints
    await queryRunner.query(`
      ALTER TABLE "telegram_users" DROP CONSTRAINT IF EXISTS "uq_telegram_users_user_id";
    `);
    await queryRunner.query(`
      ALTER TABLE "attendances" DROP CONSTRAINT IF EXISTS "uq_attendances_employee_date";
    `);

    // Drop composite indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_date_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_customer_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leave_requests_employee_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_attendances_employee_date";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_employees_status_dept";`);

    // Drop FK indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_commission_calcs_contract_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_warehouse_zones_warehouse_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_imports_uploaded_by";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_telegram_users_user_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_departments_parent_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_departments_manager_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leave_requests_approved_by_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leave_requests_employee_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_attendances_employee_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_employees_user_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_employees_manager_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_employees_position_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_employees_department_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_invoice_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_customer_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_routes_driver_id";`);

    // Note: We don't revert ON DELETE behaviors as that would require
    // recreating all FK constraints without ON DELETE clauses.
    // The default NO ACTION is functionally similar to RESTRICT.

    logger.log('✅ P1 database fixes reverted (indexes and constraints only)');
  }
}
