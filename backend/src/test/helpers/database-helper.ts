import { DataSource, Repository, ObjectLiteral, EntityTarget, EntitySchema } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '@nestjs/common';

// Type compatible with TypeORM module entity arrays
type EntityClassOrSchema = (new (...args: unknown[]) => unknown) | EntitySchema;

/**
 * Database Test Helper
 *
 * Provides utilities for database testing including:
 * - In-memory database setup
 * - Transaction rollback after each test
 * - Repository mocking
 * - Data seeding
 */
export class DatabaseTestHelper {
  private dataSource: DataSource;

  /**
   * Create a test database connection
   * Uses SQLite in-memory for fast test execution
   */
  async createTestingModule(entities: EntityClassOrSchema[], providers: Provider[] = []): Promise<TestingModule> {
    return await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities,
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature(entities),
      ],
      providers,
    }).compile();
  }

  /**
   * Initialize database connection
   */
  async connect(dataSource: DataSource): Promise<void> {
    this.dataSource = dataSource;
    await this.dataSource.synchronize(true);
  }

  /**
   * Clean up all tables
   */
  async cleanup(): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const entities = this.dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  /**
   * Get repository for entity
   */
  getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.dataSource.getRepository(entity);
  }

  /**
   * Execute raw SQL query
   */
  async query(sql: string, parameters?: unknown[]): Promise<unknown> {
    return await this.dataSource.query(sql, parameters);
  }

  /**
   * Start a transaction for testing
   */
  async startTransaction(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  }
}

/**
 * Create a mock repository for testing
 */
/**
 * Mock QueryBuilder interface for testing
 */
interface MockQueryBuilder {
  where: jest.Mock;
  andWhere: jest.Mock;
  orWhere: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  innerJoinAndSelect: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  getOne: jest.Mock;
  getMany: jest.Mock;
  getManyAndCount: jest.Mock;
  getCount: jest.Mock;
  getRawMany: jest.Mock;
  execute: jest.Mock;
}

/**
 * Create a mock QueryBuilder for testing
 */
function createMockQueryBuilder(): MockQueryBuilder {
  const mockQb: MockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    execute: jest.fn(),
  };
  // Make chaining methods return the mock
  Object.values(mockQb).forEach((fn) => {
    if (typeof fn === 'function' && fn.mockReturnThis) {
      fn.mockReturnThis();
    }
  });
  return mockQb;
}

export function createMockRepository<T extends ObjectLiteral>(): Partial<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()) as unknown as Repository<T>['createQueryBuilder'],
  };
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
