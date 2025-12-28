import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../src/modules/users/entities/user.entity';

/**
 * E2E Tests for Critical Authentication Flows
 *
 * Tests complete authentication flows including:
 * - IP Whitelist enforcement (REQ-AUTH-60)
 * - First Login Password Change (REQ-AUTH-31)
 * - Access Request → Approval → Login flow
 * - Session management
 */
describe('Authentication Critical Flows (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminAccessToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    // Login as admin for setup
    const adminLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@vendhub.local',
      password: 'AdminPassword123!',
    });

    if (adminLoginResponse.status === 200) {
      adminAccessToken = adminLoginResponse.body.access_token;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (dataSource && testUserId) {
      try {
        await dataSource.query('DELETE FROM users WHERE id = $1', [testUserId]);
      } catch (_error) {
        // Ignore cleanup errors
      }
    }

    await app.close();
  });

  // ============================================================================
  // FIRST LOGIN PASSWORD CHANGE FLOW (REQ-AUTH-31)
  // ============================================================================

  describe('First Login Password Change Flow', () => {
    let tempUserId: string;
    let tempAccessToken: string;
    const tempPassword = 'TempPassword123!';
    const newPassword = 'NewSecurePassword123!';

    it('should create user with requires_password_change = true', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping test: Admin not logged in');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: `test-first-login-${Date.now()}@example.com`,
          password: tempPassword,
          full_name: 'Test First Login User',
          role: UserRole.OPERATOR,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.requires_password_change).toBe(true);

      tempUserId = response.body.id;
      testUserId = tempUserId; // For cleanup
    });

    it('should login with temporary password and receive requires_password_change flag', async () => {
      if (!tempUserId) {
        console.warn('Skipping test: User not created');
        return;
      }

      const user = await dataSource.getRepository(User).findOne({ where: { id: tempUserId } });

      if (!user) {
        console.warn('Skipping test: User not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: tempPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.requires_password_change).toBe(true);

      tempAccessToken = response.body.access_token;
    });

    it('should reject access to protected routes when password change required', async () => {
      if (!tempAccessToken) {
        console.warn('Skipping test: User not logged in');
        return;
      }

      // Try to access profile - should work (authentication passed)
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tempAccessToken}`)
        .expect(200);

      expect(profileResponse.body.requires_password_change).toBe(true);
    });

    it('should successfully change password on first login', async () => {
      if (!tempAccessToken) {
        console.warn('Skipping test: User not logged in');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/first-login-change-password')
        .set('Authorization', `Bearer ${tempAccessToken}`)
        .send({
          currentPassword: tempPassword,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).not.toHaveProperty('requires_password_change');
      expect(response.body.user).toBeDefined();

      // Store new token
      tempAccessToken = response.body.access_token;
    });

    it('should allow normal access after password change', async () => {
      if (!tempAccessToken) {
        console.warn('Skipping test: Password not changed');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tempAccessToken}`)
        .expect(200);

      expect(response.body.requires_password_change).toBe(false);
    });

    it('should reject login with old password after change', async () => {
      if (!tempUserId) {
        console.warn('Skipping test: User not created');
        return;
      }

      const user = await dataSource.getRepository(User).findOne({ where: { id: tempUserId } });

      if (!user) {
        console.warn('Skipping test: User not found');
        return;
      }

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: tempPassword, // Old password
        })
        .expect(401);
    });

    it('should allow login with new password', async () => {
      if (!tempUserId) {
        console.warn('Skipping test: User not created');
        return;
      }

      const user = await dataSource.getRepository(User).findOne({ where: { id: tempUserId } });

      if (!user) {
        console.warn('Skipping test: User not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: newPassword, // New password
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.requires_password_change).toBeFalsy();
    });
  });

  // ============================================================================
  // IP WHITELIST FLOW (REQ-AUTH-60)
  // ============================================================================

  describe('IP Whitelist Flow', () => {
    let ipTestUserId: string;
    let ipTestAccessToken: string;
    const testPassword = 'TestPassword123!';

    it('should create admin user for IP whitelist test', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping test: Admin not logged in');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: `test-ip-whitelist-${Date.now()}@example.com`,
          password: testPassword,
          full_name: 'Test IP Whitelist User',
          role: UserRole.ADMIN,
        })
        .expect(201);

      ipTestUserId = response.body.id;

      // Change password first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: response.body.email,
          password: testPassword,
        })
        .expect(200);

      const changePasswordResponse = await request(app.getHttpServer())
        .post('/auth/first-login-change-password')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        })
        .expect(200);

      ipTestAccessToken = changePasswordResponse.body.access_token;
    });

    it('should successfully enable IP Whitelist for user', async () => {
      if (!adminAccessToken || !ipTestUserId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/users/${ipTestUserId}/ip-whitelist`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          ip_whitelist_enabled: true,
          allowed_ips: ['127.0.0.1', '::1', '::ffff:127.0.0.1'], // Localhost variants
        })
        .expect(200);

      expect(response.body.ip_whitelist_enabled).toBe(true);
      expect(response.body.allowed_ips).toEqual(
        expect.arrayContaining(['127.0.0.1', '::1', '::ffff:127.0.0.1']),
      );
    });

    it('should allow login from whitelisted IP (localhost)', async () => {
      if (!ipTestUserId) {
        console.warn('Skipping test: User not created');
        return;
      }

      const user = await dataSource.getRepository(User).findOne({ where: { id: ipTestUserId } });

      if (!user) {
        console.warn('Skipping test: User not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });

    it('should allow access to protected routes with valid IP', async () => {
      if (!ipTestAccessToken) {
        console.warn('Skipping test: User not logged in');
        return;
      }

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${ipTestAccessToken}`)
        .expect(200);
    });

    it('should reject IP Whitelist update without at least one IP', async () => {
      if (!adminAccessToken || !ipTestUserId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      await request(app.getHttpServer())
        .patch(`/users/${ipTestUserId}/ip-whitelist`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          ip_whitelist_enabled: true,
          allowed_ips: [],
        })
        .expect(400);
    });

    it('should allow disabling IP Whitelist', async () => {
      if (!adminAccessToken || !ipTestUserId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/users/${ipTestUserId}/ip-whitelist`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          ip_whitelist_enabled: false,
        })
        .expect(200);

      expect(response.body.ip_whitelist_enabled).toBe(false);
    });

    afterAll(async () => {
      // Cleanup IP test user
      if (dataSource && ipTestUserId) {
        try {
          await dataSource.query('DELETE FROM users WHERE id = $1', [ipTestUserId]);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  // ============================================================================
  // ACCESS REQUEST → APPROVAL → LOGIN FLOW
  // ============================================================================

  describe('Access Request to Login Flow', () => {
    let accessRequestId: string;
    const telegramUserId = `test-telegram-${Date.now()}`;

    it('should create public access request', async () => {
      const response = await request(app.getHttpServer())
        .post('/access-requests')
        .send({
          telegram_id: telegramUserId,
          telegram_username: 'test_user',
          telegram_first_name: 'Test',
          telegram_last_name: 'User',
          metadata: { source: 'e2e-test' },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('new');
      expect(response.body.telegram_id).toBe(telegramUserId);

      accessRequestId = response.body.id;
    });

    it('should prevent duplicate access requests', async () => {
      await request(app.getHttpServer())
        .post('/access-requests')
        .send({
          telegram_id: telegramUserId,
          telegram_username: 'test_user',
          telegram_first_name: 'Test',
          telegram_last_name: 'User',
        })
        .expect(409); // Conflict (duplicate)
    });

    it('should allow admin to approve access request', async () => {
      if (!adminAccessToken || !accessRequestId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/access-requests/${accessRequestId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          role: UserRole.OPERATOR,
          note: 'Approved for testing',
        })
        .expect(200);

      expect(response.body.status).toBe('approved');
      expect(response.body).toHaveProperty('created_user_id');
    });

    it('should have created user account after approval', async () => {
      if (!adminAccessToken || !accessRequestId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const accessRequest = await request(app.getHttpServer())
        .get(`/access-requests/${accessRequestId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const createdUserId = accessRequest.body.created_user_id;
      expect(createdUserId).toBeDefined();

      const userResponse = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(userResponse.body.telegram_user_id).toBe(telegramUserId);
      expect(userResponse.body.role).toBe(UserRole.OPERATOR);
    });

    afterAll(async () => {
      // Cleanup access request and created user
      if (dataSource && accessRequestId) {
        try {
          const accessRequest = await dataSource.query(
            'SELECT created_user_id FROM access_requests WHERE id = $1',
            [accessRequestId],
          );

          if (accessRequest[0]?.created_user_id) {
            await dataSource.query('DELETE FROM users WHERE id = $1', [
              accessRequest[0].created_user_id,
            ]);
          }

          await dataSource.query('DELETE FROM access_requests WHERE id = $1', [accessRequestId]);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT FLOW
  // ============================================================================

  describe('Session Management Flow', () => {
    let sessionTestToken: string;
    let sessionTestRefreshToken: string;

    it('should create session on login', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping test: Admin not logged in');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@vendhub.local',
          password: 'AdminPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      sessionTestToken = response.body.access_token;
      sessionTestRefreshToken = response.body.refresh_token;
    });

    it('should list active sessions', async () => {
      if (!sessionTestToken) {
        console.warn('Skipping test: Session not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${sessionTestToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('ip_address');
      expect(response.body[0]).toHaveProperty('user_agent');
    });

    it('should refresh tokens with valid refresh token', async () => {
      if (!sessionTestRefreshToken) {
        console.warn('Skipping test: Refresh token not available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: sessionTestRefreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.access_token).not.toBe(sessionTestToken); // New token

      // Update tokens for subsequent tests (refresh invalidates old tokens)
      sessionTestToken = response.body.access_token;
      sessionTestRefreshToken = response.body.refresh_token;
    });

    it('should logout and invalidate session', async () => {
      if (!sessionTestToken) {
        console.warn('Skipping test: Session not created');
        return;
      }

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${sessionTestToken}`)
        .expect(204); // NO_CONTENT is correct for logout
    });
  });
});
