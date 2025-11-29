import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseTables1731620000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create warehouse_type enum
    await queryRunner.query(`
      CREATE TYPE warehouse_type AS ENUM ('main', 'regional', 'transit', 'virtual');
    `);

    // Create zone_type enum
    await queryRunner.query(`
      CREATE TYPE zone_type AS ENUM (
        'receiving', 'storage', 'picking', 'packing', 'shipping', 'quarantine', 'returns'
      );
    `);

    // Create movement_type enum
    await queryRunner.query(`
      CREATE TYPE movement_type AS ENUM (
        'receipt', 'shipment', 'transfer', 'adjustment', 'return', 'write_off', 'production', 'assembly'
      );
    `);

    // Create movement_status enum
    await queryRunner.query(`
      CREATE TYPE movement_status AS ENUM ('pending', 'completed', 'cancelled');
    `);

    // Create reservation_status enum
    await queryRunner.query(`
      CREATE TYPE reservation_status AS ENUM (
        'pending', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'
      );
    `);

    // Create stock_take_status enum
    await queryRunner.query(`
      CREATE TYPE stock_take_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
    `);

    // Create warehouses table
    await queryRunner.query(`
      CREATE TABLE warehouses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        warehouse_type warehouse_type NOT NULL,
        location_id UUID,
        address TEXT,
        total_area_sqm DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true,
        manager_name VARCHAR(200),
        contact_phone VARCHAR(50),
        contact_email VARCHAR(200),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_warehouses_location ON warehouses(location_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_warehouses_active ON warehouses(is_active) WHERE deleted_at IS NULL;
    `);

    // Create warehouse_zones table
    await queryRunner.query(`
      CREATE TABLE warehouse_zones (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        zone_type zone_type NOT NULL,
        area_sqm DECIMAL(10, 2),
        capacity INTEGER,
        current_occupancy INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_zones_warehouse ON warehouse_zones(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_zones_active ON warehouse_zones(is_active) WHERE deleted_at IS NULL;
    `);

    // Create inventory_batches table
    await queryRunner.query(`
      CREATE TABLE inventory_batches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_number VARCHAR(100) NOT NULL,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL,
        zone_id UUID REFERENCES warehouse_zones(id),
        initial_quantity DECIMAL(10, 3) NOT NULL,
        current_quantity DECIMAL(10, 3) NOT NULL,
        reserved_quantity DECIMAL(10, 3) DEFAULT 0,
        available_quantity DECIMAL(10, 3) DEFAULT 0,
        unit VARCHAR(20) NOT NULL,
        unit_cost DECIMAL(10, 2),
        production_date DATE,
        expiry_date DATE,
        received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        supplier VARCHAR(200),
        is_active BOOLEAN DEFAULT true,
        is_quarantined BOOLEAN DEFAULT false,
        quarantine_reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batches_warehouse ON inventory_batches(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batches_product ON inventory_batches(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batches_batch_number ON inventory_batches(batch_number);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batches_expiry ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batches_warehouse_product ON inventory_batches(warehouse_id, product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batches_active ON inventory_batches(is_active, is_quarantined) WHERE deleted_at IS NULL;
    `);

    // Create stock_movements table
    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        movement_number VARCHAR(50) UNIQUE NOT NULL,
        movement_type movement_type NOT NULL,
        status movement_status DEFAULT 'completed',
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        destination_warehouse_id UUID REFERENCES warehouses(id),
        product_id UUID NOT NULL,
        batch_id UUID REFERENCES inventory_batches(id),
        quantity DECIMAL(10, 3) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        unit_cost DECIMAL(10, 2),
        total_cost DECIMAL(12, 2),
        movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reference_document VARCHAR(100),
        performed_by_id UUID,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_movements_warehouse ON stock_movements(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_movements_product ON stock_movements(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_movements_batch ON stock_movements(batch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_movements_date ON stock_movements(movement_date);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_movements_type ON stock_movements(movement_type);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_movements_warehouse_product ON stock_movements(warehouse_id, product_id);
    `);

    // Create stock_reservations table
    await queryRunner.query(`
      CREATE TABLE stock_reservations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reservation_number VARCHAR(50) UNIQUE NOT NULL,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL,
        batch_id UUID REFERENCES inventory_batches(id),
        quantity_reserved DECIMAL(10, 3) NOT NULL,
        quantity_fulfilled DECIMAL(10, 3) DEFAULT 0,
        unit VARCHAR(20) NOT NULL,
        status reservation_status DEFAULT 'pending',
        reserved_for VARCHAR(200) NOT NULL,
        reserved_by_id UUID,
        reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        fulfilled_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reservations_warehouse ON stock_reservations(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reservations_product ON stock_reservations(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reservations_batch ON stock_reservations(batch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reservations_status ON stock_reservations(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reservations_expires ON stock_reservations(expires_at) WHERE expires_at IS NOT NULL;
    `);

    // Create stock_takes table
    await queryRunner.query(`
      CREATE TABLE stock_takes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stock_take_number VARCHAR(50) UNIQUE NOT NULL,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        zone_id UUID REFERENCES warehouse_zones(id),
        status stock_take_status DEFAULT 'planned',
        scheduled_date DATE NOT NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        conducted_by_id UUID,
        approved_by_id UUID,
        total_items_counted INTEGER DEFAULT 0,
        discrepancies_found INTEGER DEFAULT 0,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_takes_warehouse ON stock_takes(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_takes_status ON stock_takes(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_takes_date ON stock_takes(scheduled_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS stock_takes CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_reservations CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_movements CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_batches CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_zones CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouses CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS stock_take_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS reservation_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS movement_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS movement_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS zone_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS warehouse_type;`);
  }
}
