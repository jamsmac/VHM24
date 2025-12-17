import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { DataSource } from 'typeorm';

// Types for API response objects
interface UserListItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

interface MachineListItem {
  id: string;
  machine_number: string;
  name: string;
  status: string;
}

interface InventoryMovementItem {
  id: string;
  movement_type: string;
  quantity: number;
  nomenclature_id: string;
}

/**
 * Integration tests for authentication flow
 *
 * These tests verify the complete authentication flow including:
 * - User registration
 * - Login with credentials
 * - Password security (no exposure of sensitive fields)
 * - Token refresh
 * - Protected endpoints access
 *
 * NOTE: These are E2E tests requiring a live database.
 * Run with: docker-compose up -d && npm run test:e2e
 */
describe.skip('Auth Integration Tests (Critical Security Flow)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Clean up test data
    await dataSource.query(`DELETE FROM users WHERE email LIKE 'test-%@example.com'`);
    await app.close();
  });

  describe('Critical Security: Password Hash Protection', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      full_name: 'Test User',
      role: 'OPERATOR',
    };

    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    it('POST /auth/register - should create user WITHOUT exposing password_hash', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      // CRITICAL: Ensure no sensitive fields are exposed
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(response.body.user).not.toHaveProperty('two_fa_secret');
      expect(response.body.user).not.toHaveProperty('refresh_token');

      // Store tokens for next tests
      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
      userId = response.body.user.id;
    });

    it('POST /auth/login - should authenticate WITHOUT exposing password_hash', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Verify response
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toHaveProperty('email', testUser.email);

      // CRITICAL: Ensure no sensitive fields
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(response.body.user).not.toHaveProperty('two_fa_secret');
      expect(response.body.user).not.toHaveProperty('refresh_token');
    });

    it('GET /users/:id - should return user WITHOUT sensitive fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify user data returned
      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('email', testUser.email);

      // CRITICAL: No sensitive fields
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).not.toHaveProperty('two_fa_secret');
      expect(response.body).not.toHaveProperty('refresh_token');
    });

    it('GET /users - should return user list WITHOUT sensitive fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should be an array
      expect(Array.isArray(response.body)).toBe(true);

      // Check each user in the list
      response.body.forEach((user: UserListItem) => {
        expect(user).not.toHaveProperty('password_hash');
        expect(user).not.toHaveProperty('two_fa_secret');
        expect(user).not.toHaveProperty('refresh_token');
      });
    });

    it('POST /auth/refresh - should refresh tokens WITHOUT exposing sensitive data', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      // User info if included should not have sensitive fields
      if (response.body.user) {
        expect(response.body.user).not.toHaveProperty('password_hash');
        expect(response.body.user).not.toHaveProperty('two_fa_secret');
        expect(response.body.user).not.toHaveProperty('refresh_token');
      }
    });

    it('PATCH /users/:id - should update user WITHOUT exposing sensitive fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          full_name: 'Updated Test User',
        })
        .expect(200);

      expect(response.body).toHaveProperty('full_name', 'Updated Test User');

      // CRITICAL: No sensitive fields
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).not.toHaveProperty('two_fa_secret');
      expect(response.body).not.toHaveProperty('refresh_token');
    });
  });

  describe('Critical Flow: Authentication & Authorization', () => {
    it('should not allow access to protected endpoints without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should not allow access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle login with wrong password', async () => {
      const testEmail = `test-wrong-${Date.now()}@example.com`;

      // First create a user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: testEmail,
        password: 'CorrectPassword123!',
        full_name: 'Test User',
        role: 'OPERATOR',
      });

      // Try to login with wrong password
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Неверный email или пароль');
    });
  });

  describe('Critical Flow: Soft Delete Data Integrity', () => {
    let adminToken: string;
    let machineId: string;

    beforeAll(async () => {
      // Create admin user for testing
      const adminResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test-admin-${Date.now()}@example.com`,
          password: 'AdminPassword123!',
          full_name: 'Test Admin',
          role: 'ADMIN',
        });

      adminToken = adminResponse.body.access_token;
    });

    it('should handle soft delete cascade for machines', async () => {
      // Create a machine
      const createResponse = await request(app.getHttpServer())
        .post('/machines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          machine_number: `M-TEST-${Date.now()}`,
          name: 'Test Machine',
          location_id: 'test-location-id',
          type_code: 'vending',
        })
        .expect(201);

      machineId = createResponse.body.id;

      // Soft delete the machine
      await request(app.getHttpServer())
        .delete(`/machines/${machineId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify machine is not returned in list (soft deleted)
      const listResponse = await request(app.getHttpServer())
        .get('/machines')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deletedMachine = listResponse.body.find((m: MachineListItem) => m.id === machineId);
      expect(deletedMachine).toBeUndefined();
    });
  });

  describe('Critical Flow: Inventory Query Optimization', () => {
    let operatorToken: string;

    beforeAll(async () => {
      const operatorResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test-operator-${Date.now()}@example.com`,
          password: 'OperatorPassword123!',
          full_name: 'Test Operator',
          role: 'OPERATOR',
        });

      operatorToken = operatorResponse.body.access_token;
    });

    it('GET /inventory/movements - should not expose user sensitive data', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/movements')
        .set('Authorization', `Bearer ${operatorToken}`)
        .query({
          limit: 10,
          offset: 0,
        })
        .expect(200);

      if (response.body.data && response.body.data.length > 0) {
        response.body.data.forEach((movement: InventoryMovementItem & { performed_by?: UserListItem }) => {
          // Check if performed_by user data doesn't contain sensitive fields
          if (movement.performed_by) {
            expect(movement.performed_by).not.toHaveProperty('password_hash');
            expect(movement.performed_by).not.toHaveProperty('two_fa_secret');
            expect(movement.performed_by).not.toHaveProperty('refresh_token');
          }
        });
      }
    });
  });
});
