# Test Table Migration - Example Documentation

## Overview

This migration demonstrates the standard VendHub approach to creating TypeORM migrations following PostgreSQL and project conventions.

## Migration Details

**File**: `1732430000000-CreateTestTable.ts`
**Entity**: `/backend/src/common/entities/test.entity.ts`

## VendHub Migration Standards Applied

### 1. **BaseEntity Pattern**
All tables include standard fields from BaseEntity:
- `id` - UUID primary key with auto-generation
- `created_at` - Timestamp with time zone (auto-set on creation)
- `updated_at` - Timestamp with time zone (auto-updated)
- `deleted_at` - Timestamp with time zone (for soft deletes, nullable)

### 2. **Naming Conventions**
- **Table names**: `snake_case` (e.g., `test_table`)
- **Column names**: `snake_case` (e.g., `created_at`)
- **Index names**: `IDX_{table}_{column}` (e.g., `IDX_test_table_name`)
- **Class names**: `PascalCase` with timestamp suffix (e.g., `CreateTestTable1732430000000`)

### 3. **PostgreSQL Best Practices**
- Use `timestamp with time zone` for all datetime fields
- Use `uuid_generate_v4()` for UUID generation
- Add table and column comments for documentation
- Create indexes on frequently queried fields

### 4. **Migration Structure**

#### up() Method:
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Create table with all columns
  await queryRunner.createTable(new Table({...}), true);

  // 2. Create indexes
  await queryRunner.createIndex('table_name', new TableIndex({...}));

  // 3. Add comments for documentation
  await queryRunner.query(`COMMENT ON TABLE ...`);

  // 4. Create foreign keys (if needed)
  await queryRunner.createForeignKey('table_name', new TableForeignKey({...}));
}
```

#### down() Method:
Reverse order of up():
```typescript
public async down(queryRunner: QueryRunner): Promise<void> {
  // 1. Drop foreign keys first
  await queryRunner.dropForeignKey('table_name', 'FK_name');

  // 2. Drop indexes
  await queryRunner.dropIndex('table_name', 'IDX_name');

  // 3. Drop table (true = cascade)
  await queryRunner.dropTable('table_name', true);
}
```

### 5. **Index Strategy**
Always create indexes on:
- Foreign key columns
- Frequently filtered columns (status, type)
- Date columns used in time-range queries
- Columns used in JOIN operations

## Table Schema

```sql
CREATE TABLE test_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IDX_test_table_name ON test_table(name);
CREATE INDEX IDX_test_table_created_at ON test_table(created_at);

COMMENT ON TABLE test_table IS 'Test table for demonstration purposes';
COMMENT ON COLUMN test_table.name IS 'Name field for testing';
```

## Running the Migration

```bash
# Generate migration (if creating manually)
npm run migration:generate -- -n CreateTestTable

# Run migration
npm run migration:run

# Revert migration
npm run migration:revert
```

## Entity Definition

```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('test_table')
@Index(['name'])
@Index(['created_at'])
export class TestEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;
}
```

## Key Takeaways

1. **Always extend BaseEntity** - Provides standard fields and soft delete support
2. **Use snake_case** - PostgreSQL convention for table/column names
3. **Add indexes strategically** - On foreign keys and frequently queried fields
4. **Document with comments** - Use PostgreSQL COMMENT for table/column documentation
5. **Complete down() method** - Always provide proper rollback logic
6. **Use proper types** - `timestamp with time zone` for dates, `uuid` for IDs
7. **Follow naming patterns** - Consistent naming for indexes, foreign keys

## Common Patterns

### Foreign Key Example
```typescript
await queryRunner.createForeignKey(
  'test_table',
  new TableForeignKey({
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE', // or 'SET NULL', 'RESTRICT'
    name: 'FK_test_table_user',
  }),
);
```

### Enum Column Example
```typescript
{
  name: 'status',
  type: 'enum',
  enum: ['active', 'inactive', 'deleted'],
  default: "'active'",
}
```

### JSONB Column Example
```typescript
{
  name: 'metadata',
  type: 'jsonb',
  default: "'{}'",
  isNullable: true,
}
```

## References

- **CLAUDE.md** - Main AI assistant guide
- **.claude/rules.md** - Complete coding rules
- **Existing migrations** - Check `backend/src/database/migrations/` for examples
- **BaseEntity** - `/backend/src/common/entities/base.entity.ts`

---

**Created**: 2025-11-22
**Purpose**: Educational example demonstrating VendHub migration standards
