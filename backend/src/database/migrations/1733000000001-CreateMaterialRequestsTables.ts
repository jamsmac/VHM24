import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Material Requests Module Tables
 *
 * Creates tables for:
 * - suppliers: Поставщики материалов
 * - materials: Каталог материалов
 * - material_requests: Заявки на материалы
 * - material_request_items: Позиции заявок
 */
export class CreateMaterialRequestsTables1733000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // ENUMS
    // ========================================

    // Material category enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE material_category AS ENUM (
          'ingredients',
          'consumables',
          'cleaning',
          'spare_parts',
          'packaging',
          'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Request status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE material_request_status AS ENUM (
          'new',
          'approved',
          'rejected',
          'sent',
          'partial_delivered',
          'completed',
          'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Request priority enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE material_request_priority AS ENUM (
          'low',
          'normal',
          'high',
          'urgent'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ========================================
    // SUPPLIERS TABLE
    // ========================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        telegram_id VARCHAR(64),
        telegram_username VARCHAR(100),
        address VARCHAR(500),
        notes TEXT,
        categories TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Indexes for suppliers
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_telegram_id ON suppliers(telegram_id) WHERE telegram_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    `);

    // ========================================
    // MATERIALS TABLE
    // ========================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        category material_category NOT NULL DEFAULT 'other',
        unit VARCHAR(50) DEFAULT 'шт',
        sku VARCHAR(100),
        description TEXT,
        unit_price DECIMAL(15, 2),
        min_order_quantity INTEGER DEFAULT 1,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        image_url VARCHAR(500),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Indexes for materials
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_is_active ON materials(is_active) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku) WHERE sku IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_sort ON materials(sort_order, name);
    `);

    // ========================================
    // MATERIAL REQUESTS TABLE
    // ========================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_number VARCHAR(50) UNIQUE NOT NULL,
        status material_request_status NOT NULL DEFAULT 'new',
        priority material_request_priority NOT NULL DEFAULT 'normal',

        -- Creator
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

        -- Approval
        approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,

        -- Rejection
        rejected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        rejected_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,

        -- Sent to supplier
        sent_at TIMESTAMP WITH TIME ZONE,
        sent_message_id VARCHAR(100),

        -- Completion
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

        -- Comments and notes
        comment TEXT,
        admin_notes TEXT,
        completion_notes TEXT,

        -- Dates
        desired_delivery_date DATE,
        actual_delivery_date DATE,

        -- Totals
        total_amount DECIMAL(15, 2),

        -- Metadata
        metadata JSONB,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Indexes for material_requests
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_requests_priority ON material_requests(priority);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_requests_created_by ON material_requests(created_by_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_requests_approved_by ON material_requests(approved_by_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_requests_created_at ON material_requests(created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_requests_number ON material_requests(request_number);
    `);

    // ========================================
    // MATERIAL REQUEST ITEMS TABLE
    // ========================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_request_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
        material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

        -- Quantities
        quantity INTEGER NOT NULL,
        received_quantity INTEGER,

        -- Unit info
        unit VARCHAR(50) DEFAULT 'шт',

        -- Pricing
        unit_price DECIMAL(15, 2),
        total_price DECIMAL(15, 2),

        -- Notes
        notes TEXT,

        -- Status
        is_fulfilled BOOLEAN DEFAULT false,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Indexes for material_request_items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_request_items_request_id ON material_request_items(request_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_request_items_material_id ON material_request_items(material_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_request_items_supplier_id ON material_request_items(supplier_id);
    `);

    // ========================================
    // TRIGGERS FOR updated_at
    // ========================================

    // Create trigger function if not exists
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Suppliers trigger
    await queryRunner.query(`
      CREATE TRIGGER update_suppliers_updated_at
      BEFORE UPDATE ON suppliers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Materials trigger
    await queryRunner.query(`
      CREATE TRIGGER update_materials_updated_at
      BEFORE UPDATE ON materials
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Material requests trigger
    await queryRunner.query(`
      CREATE TRIGGER update_material_requests_updated_at
      BEFORE UPDATE ON material_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Material request items trigger
    await queryRunner.query(`
      CREATE TRIGGER update_material_request_items_updated_at
      BEFORE UPDATE ON material_request_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_material_request_items_updated_at ON material_request_items;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_material_requests_updated_at ON material_requests;`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;`);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS material_request_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS material_requests CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS materials CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS suppliers CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS material_request_priority;`);
    await queryRunner.query(`DROP TYPE IF EXISTS material_request_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS material_category;`);
  }
}
