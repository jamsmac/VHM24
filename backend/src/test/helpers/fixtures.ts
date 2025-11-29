import { User, UserRole, UserStatus } from '@modules/users/entities/user.entity';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';
import { Task, TaskType, TaskStatus, TaskPriority } from '@modules/tasks/entities/task.entity';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/entities/transaction.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';
import { Location, LocationStatus } from '@modules/locations/entities/location.entity';

/**
 * Test Fixtures
 *
 * Provides factory functions for creating test data entities
 * with sensible defaults that can be overridden as needed
 */

/**
 * Create a test user
 */
export function createTestUser(overrides?: Partial<User>): User {
  const user = new User();
  user.id = overrides?.id || 'test-user-id';
  user.full_name = overrides?.full_name || 'Test User';
  user.email = overrides?.email || 'test@example.com';
  user.phone = overrides?.phone || '+998901234567';
  user.password_hash = overrides?.password_hash || '$2b$10$hashedpassword';
  user.role = overrides?.role || UserRole.OPERATOR;
  user.status = overrides?.status || UserStatus.ACTIVE;
  user.telegram_user_id = overrides?.telegram_user_id || null;
  user.telegram_username = overrides?.telegram_username || null;
  user.is_2fa_enabled = overrides?.is_2fa_enabled || false;
  user.two_fa_secret = overrides?.two_fa_secret || null;
  user.last_login_at = overrides?.last_login_at || null;
  user.last_login_ip = overrides?.last_login_ip || null;
  user.refresh_token = overrides?.refresh_token || null;
  user.failed_login_attempts = overrides?.failed_login_attempts || 0;
  user.account_locked_until = overrides?.account_locked_until || null;
  user.last_failed_login_at = overrides?.last_failed_login_at || null;
  user.settings = overrides?.settings || null;
  user.created_at = overrides?.created_at || new Date();
  user.updated_at = overrides?.updated_at || new Date();
  user.deleted_at = overrides?.deleted_at || null;

  return user;
}

/**
 * Create a test admin user
 */
export function createTestAdmin(overrides?: Partial<User>): User {
  return createTestUser({
    id: 'test-admin-id',
    full_name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    ...overrides,
  });
}

/**
 * Create a test operator user
 */
export function createTestOperator(overrides?: Partial<User>): User {
  return createTestUser({
    id: 'test-operator-id',
    full_name: 'Operator User',
    email: 'operator@example.com',
    role: UserRole.OPERATOR,
    ...overrides,
  });
}

/**
 * Create a test location
 */
export function createTestLocation(overrides?: Partial<Location>): Location {
  const location = new Location();
  location.id = overrides?.id || 'test-location-id';
  location.name = overrides?.name || 'Test Location';
  location.address = overrides?.address || 'Test Address, 123';
  location.city = overrides?.city || 'Tashkent';
  location.latitude = overrides?.latitude || 41.2995;
  location.longitude = overrides?.longitude || 69.2401;
  location.type_code = overrides?.type_code || 'office';
  location.status = overrides?.status || LocationStatus.ACTIVE;
  location.contact_person = overrides?.contact_person || 'Test Contact';
  location.contact_phone = overrides?.contact_phone || '+998901234567';
  location.description = overrides?.description || null;
  location.created_at = overrides?.created_at || new Date();
  location.updated_at = overrides?.updated_at || new Date();
  location.deleted_at = overrides?.deleted_at || null;

  return location;
}

/**
 * Create a test machine
 */
export function createTestMachine(overrides?: Partial<Machine>): Machine {
  const machine = new Machine();
  machine.id = overrides?.id || 'test-machine-id';
  machine.machine_number = overrides?.machine_number || 'M-001';
  machine.name = overrides?.name || 'Test Coffee Machine';
  machine.type_code = overrides?.type_code || 'coffee_machine';
  machine.location_id = overrides?.location_id || 'test-location-id';
  machine.contract_id = overrides?.contract_id || null;
  machine.status = overrides?.status || MachineStatus.ACTIVE;
  machine.manufacturer = overrides?.manufacturer || 'VendCo';
  machine.model = overrides?.model || 'VM-2000';
  machine.serial_number = overrides?.serial_number || 'SN123456';
  machine.year_of_manufacture = overrides?.year_of_manufacture || null;
  machine.installation_date = overrides?.installation_date || null;
  machine.last_maintenance_date = overrides?.last_maintenance_date || null;
  machine.next_maintenance_date = overrides?.next_maintenance_date || null;
  machine.max_product_slots = overrides?.max_product_slots || 10;
  machine.current_product_count = overrides?.current_product_count || 0;
  machine.cash_capacity = overrides?.cash_capacity || 1000000;
  machine.current_cash_amount = overrides?.current_cash_amount || 0;
  machine.accepts_cash = overrides?.accepts_cash ?? true;
  machine.accepts_card = overrides?.accepts_card ?? false;
  machine.accepts_qr = overrides?.accepts_qr ?? false;
  machine.accepts_nfc = overrides?.accepts_nfc ?? false;
  machine.qr_code = overrides?.qr_code || 'QR-M-001';
  machine.qr_code_url = overrides?.qr_code_url || null;
  machine.assigned_operator_id = overrides?.assigned_operator_id || null;
  machine.assigned_technician_id = overrides?.assigned_technician_id || null;
  machine.notes = overrides?.notes || null;
  machine.settings = overrides?.settings || null;
  machine.metadata = overrides?.metadata || null;
  machine.low_stock_threshold_percent = overrides?.low_stock_threshold_percent || 10;
  machine.total_sales_count = overrides?.total_sales_count || 0;
  machine.total_revenue = overrides?.total_revenue || 0;
  machine.last_refill_date = overrides?.last_refill_date || null;
  machine.last_collection_date = overrides?.last_collection_date || null;
  machine.last_ping_at = overrides?.last_ping_at || null;
  machine.is_online = overrides?.is_online ?? false;
  machine.connectivity_status = overrides?.connectivity_status || 'unknown';
  machine.purchase_price = overrides?.purchase_price || null;
  machine.purchase_date = overrides?.purchase_date || null;
  machine.depreciation_years = overrides?.depreciation_years || null;
  machine.depreciation_method = overrides?.depreciation_method || 'linear';
  machine.accumulated_depreciation = overrides?.accumulated_depreciation || 0;
  machine.last_depreciation_date = overrides?.last_depreciation_date || null;
  machine.is_disposed = overrides?.is_disposed ?? false;
  machine.disposal_date = overrides?.disposal_date || null;
  machine.disposal_reason = overrides?.disposal_reason || null;
  machine.disposal_transaction_id = overrides?.disposal_transaction_id || null;
  machine.created_at = overrides?.created_at || new Date();
  machine.updated_at = overrides?.updated_at || new Date();
  machine.deleted_at = overrides?.deleted_at || null;

  return machine;
}

/**
 * Create a test nomenclature (product)
 */
export function createTestNomenclature(overrides?: Partial<Nomenclature>): Nomenclature {
  const nomenclature = new Nomenclature();
  nomenclature.id = overrides?.id || 'test-nomenclature-id';
  nomenclature.sku = overrides?.sku || 'COFFEE-001';
  nomenclature.name = overrides?.name || 'Coffee Arabica';
  nomenclature.category_code = overrides?.category_code || 'coffee';
  nomenclature.unit_of_measure_code = overrides?.unit_of_measure_code || 'kg';
  nomenclature.description = overrides?.description || 'Premium Arabica Coffee';
  nomenclature.purchase_price = overrides?.purchase_price || 50000;
  nomenclature.selling_price = overrides?.selling_price || 100000;
  nomenclature.currency = overrides?.currency || 'UZS';
  nomenclature.weight = overrides?.weight || null;
  nomenclature.barcode = overrides?.barcode || '1234567890123';
  nomenclature.min_stock_level = overrides?.min_stock_level || 0;
  nomenclature.max_stock_level = overrides?.max_stock_level || 1000;
  nomenclature.shelf_life_days = overrides?.shelf_life_days || null;
  nomenclature.default_supplier_id = overrides?.default_supplier_id || null;
  nomenclature.supplier_sku = overrides?.supplier_sku || null;
  nomenclature.is_active = overrides?.is_active !== undefined ? overrides.is_active : true;
  nomenclature.created_at = overrides?.created_at || new Date();
  nomenclature.updated_at = overrides?.updated_at || new Date();
  nomenclature.deleted_at = overrides?.deleted_at || null;

  return nomenclature;
}

/**
 * Create a test task
 */
export function createTestTask(overrides?: Partial<Task>): Task {
  const task = new Task();
  task.id = overrides?.id || 'test-task-id';
  task.type_code = overrides?.type_code || TaskType.REFILL;
  task.status = overrides?.status || TaskStatus.PENDING;
  task.priority = overrides?.priority || TaskPriority.NORMAL;
  task.machine_id = overrides?.machine_id || 'test-machine-id';
  task.assigned_to_user_id = overrides?.assigned_to_user_id || 'test-operator-id';
  task.created_by_user_id = overrides?.created_by_user_id || 'test-admin-id';
  task.scheduled_date = overrides?.scheduled_date || null;
  task.due_date = overrides?.due_date || null;
  task.started_at = overrides?.started_at || null;
  task.completed_at = overrides?.completed_at || null;
  task.operation_date = overrides?.operation_date || null;
  task.description = overrides?.description || 'Test task';
  task.completion_notes = overrides?.completion_notes || null;
  task.postpone_reason = overrides?.postpone_reason || null;
  task.checklist = overrides?.checklist || null;
  task.expected_cash_amount = overrides?.expected_cash_amount || null;
  task.actual_cash_amount = overrides?.actual_cash_amount || null;
  task.has_photo_before = overrides?.has_photo_before || false;
  task.has_photo_after = overrides?.has_photo_after || false;
  task.pending_photos = overrides?.pending_photos || false;
  task.offline_completed = overrides?.offline_completed || false;
  task.rejected_by_user_id = overrides?.rejected_by_user_id || null;
  task.rejected_at = overrides?.rejected_at || null;
  task.rejection_reason = overrides?.rejection_reason || null;
  task.metadata = overrides?.metadata || null;
  task.created_at = overrides?.created_at || new Date();
  task.updated_at = overrides?.updated_at || new Date();
  task.deleted_at = overrides?.deleted_at || null;

  return task;
}

/**
 * Create a test transaction
 */
export function createTestTransaction(overrides?: Partial<Transaction>): Transaction {
  const transaction = new Transaction();
  transaction.id = overrides?.id || 'test-transaction-id';
  transaction.transaction_number = overrides?.transaction_number || 'TRX-001';
  transaction.transaction_type = overrides?.transaction_type || TransactionType.COLLECTION;
  transaction.transaction_date = overrides?.transaction_date || new Date();
  transaction.sale_date = overrides?.sale_date || null;
  transaction.amount = overrides?.amount || 100000;
  transaction.currency = overrides?.currency || 'UZS';
  transaction.payment_method = overrides?.payment_method || PaymentMethod.CASH;
  transaction.machine_id = overrides?.machine_id || 'test-machine-id';
  transaction.user_id = overrides?.user_id || 'test-operator-id';
  transaction.contract_id = overrides?.contract_id || null;
  transaction.counterparty_id = overrides?.counterparty_id || null;
  transaction.recipe_id = overrides?.recipe_id || null;
  transaction.recipe_snapshot_id = overrides?.recipe_snapshot_id || null;
  transaction.recipe_version = overrides?.recipe_version || null;
  transaction.quantity = overrides?.quantity || null;
  transaction.expense_category = overrides?.expense_category || null;
  transaction.collection_task_id = overrides?.collection_task_id || null;
  transaction.description = overrides?.description || 'Test transaction';
  transaction.metadata = overrides?.metadata || null;
  transaction.created_at = overrides?.created_at || new Date();
  transaction.updated_at = overrides?.updated_at || new Date();
  transaction.deleted_at = overrides?.deleted_at || null;

  return transaction;
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUser({
      id: `test-user-${i}`,
      email: `user${i}@example.com`,
      full_name: `User ${i}`,
    }),
  );
}

/**
 * Create multiple test machines
 */
export function createTestMachines(count: number): Machine[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMachine({
      id: `test-machine-${i}`,
      machine_number: `M-${String(i).padStart(3, '0')}`,
      name: `Machine ${i}`,
    }),
  );
}

/**
 * Create multiple test tasks
 */
export function createTestTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) =>
    createTestTask({
      id: `test-task-${i}`,
    }),
  );
}

/**
 * Create multiple test transactions
 */
export function createTestTransactions(count: number): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    createTestTransaction({
      id: `test-transaction-${i}`,
      transaction_number: `TRX-${String(i).padStart(3, '0')}`,
      amount: 10000 * (i + 1),
    }),
  );
}
