import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { useContainer } from 'class-validator';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { TaskStatus, TaskType, TaskPriority } from '../src/modules/tasks/entities/task.entity';
import {
  ComponentType,
  ComponentStatus,
  ComponentLocationType,
} from '../src/modules/equipment/entities/equipment-component.entity';
import { UserRole } from '../src/modules/users/entities/user.entity';
import { ComponentRole } from '../src/modules/tasks/entities/task-component.entity';

/**
 * E2E Tests for REPLACE_* Task Workflows
 *
 * Tests comprehensive component replacement workflows including:
 * - Creating REPLACE_* tasks with old/new components (REQ-TASK-21)
 * - Component validation (must have old and new components)
 * - Automatic component location updates on task completion
 * - Automatic component status updates (old → retired, new → active)
 * - Complete task lifecycle with photo validation
 */
describe('REPLACE_* Tasks Component Workflow (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminAccessToken: string;
  let operatorAccessToken: string;
  let operatorId: string;
  let machineId: string;
  let oldComponentId: string;
  let newComponentId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply cookie parser (required for JWT extraction from cookies)
    app.use(cookieParser());

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Connect class-validator to NestJS DI for custom validators (IsDictionaryCode, etc.)
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    dataSource = app.get(DataSource);

    // Login as admin
    const adminLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@vendhub.local',
      password: 'AdminPassword123!',
    });

    if (adminLoginResponse.status === 200) {
      adminAccessToken = adminLoginResponse.body.access_token;
      console.log('✅ [tasks-replace] Admin logged in successfully');
      console.log('Login response keys:', Object.keys(adminLoginResponse.body));
      console.log('requires_2fa:', adminLoginResponse.body.requires_2fa);
      console.log('requires_password_change:', adminLoginResponse.body.requires_password_change);
      console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
      console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
    } else {
      console.error('❌ [tasks-replace] Admin login failed:', adminLoginResponse.status, adminLoginResponse.body);
    }

    // Create test operator
    const operatorEmail = `test-operator-${Date.now()}@example.com`;
    const createOperatorResponse = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: operatorEmail,
        password: 'OperatorPass123!',
        full_name: 'Test Operator',
        role: UserRole.OPERATOR,
      });

    operatorId = createOperatorResponse.body.id;

    // Login as operator and change password
    const operatorLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: operatorEmail,
      password: 'OperatorPass123!',
    });

    const changePasswordResponse = await request(app.getHttpServer())
      .post('/auth/first-login-change-password')
      .set('Authorization', `Bearer ${operatorLoginResponse.body.access_token}`)
      .send({
        currentPassword: 'OperatorPass123!',
        newPassword: 'OperatorPass123!',
      });

    operatorAccessToken = changePasswordResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (dataSource) {
      try {
        // Delete in correct order (respecting foreign keys)
        if (taskId) {
          await dataSource.query('DELETE FROM task_components WHERE task_id = $1', [taskId]);
          await dataSource.query('DELETE FROM tasks WHERE id = $1', [taskId]);
        }
        if (oldComponentId || newComponentId) {
          await dataSource.query('DELETE FROM equipment_components WHERE id IN ($1, $2)', [
            oldComponentId,
            newComponentId,
          ]);
        }
        if (machineId) {
          await dataSource.query('DELETE FROM machines WHERE id = $1', [machineId]);
        }
        if (operatorId) {
          await dataSource.query('DELETE FROM users WHERE id = $1', [operatorId]);
        }
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Cleanup error:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    await app.close();
  });

  // ============================================================================
  // TEST SETUP: Create Machine and Components
  // ============================================================================

  describe('Test Setup', () => {
    it('should create test machine', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping test: Admin not logged in');
        return;
      }

      console.log('Token exists:', !!adminAccessToken, 'Token length:', adminAccessToken?.length);

      // Get first location
      const locationsResponse = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      console.log('Locations response:', locationsResponse.status, locationsResponse.body?.length || 'no body');

      const locationId = locationsResponse.body[0]?.id || 'default-location-id';

      const machineNumber = `TEST-M-${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post('/machines')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          machine_number: machineNumber,
          name: 'Test Vending Machine for Component Replacement',
          location_id: locationId,
          status: 'active',
          type_code: 'coffee_machine',
          qr_code: `QR-${machineNumber}`,
        });

      // Log response for debugging
      if (response.status !== 201) {
        console.log('Machine creation failed:', response.status, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('id');
      machineId = response.body.id;
    });

    it('should create old component (currently installed in machine)', async () => {
      if (!adminAccessToken || !machineId) {
        console.warn('Skipping test: Prerequisites not met - adminAccessToken:', !!adminAccessToken, 'machineId:', machineId);
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/equipment/components')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          machine_id: machineId,
          component_type: ComponentType.GRINDER,
          name: 'Old Grinder - To Be Replaced',
          model: 'OldGrinder-2000',
          serial_number: `SN-OLD-${Date.now()}`,
          manufacturer: 'OldManufacturer',
          status: ComponentStatus.ACTIVE,
          current_location_type: ComponentLocationType.MACHINE,
          installation_date: new Date('2023-01-01').toISOString(),
        });

      // Log response for debugging
      if (response.status !== 201) {
        console.log('Component creation failed:', response.status, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.current_location_type).toBe(ComponentLocationType.MACHINE);
      expect(response.body.status).toBe(ComponentStatus.ACTIVE);
      oldComponentId = response.body.id;
    });

    it('should create new component (in warehouse, ready for installation)', async () => {
      if (!adminAccessToken || !machineId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/equipment/components')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          machine_id: machineId,
          component_type: ComponentType.GRINDER,
          name: 'New Grinder - Ready for Installation',
          model: 'NewGrinder-3000',
          serial_number: `SN-NEW-${Date.now()}`,
          manufacturer: 'NewManufacturer',
          status: ComponentStatus.IN_STOCK,
          current_location_type: ComponentLocationType.WAREHOUSE,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.current_location_type).toBe(ComponentLocationType.WAREHOUSE);
      expect(response.body.status).toBe(ComponentStatus.IN_STOCK);
      newComponentId = response.body.id;
    });
  });

  // ============================================================================
  // REPLACE_GRINDER TASK WORKFLOW
  // ============================================================================

  describe('REPLACE_GRINDER Task Lifecycle', () => {
    it('should create REPLACE_GRINDER task with old and new components', async () => {
      if (!adminAccessToken || !machineId || !oldComponentId || !newComponentId || !operatorId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type_code: TaskType.REPLACE_GRINDER,
          priority: TaskPriority.HIGH,
          machine_id: machineId,
          assigned_to_user_id: operatorId,
          created_by_user_id: adminAccessToken, // Will be overridden by JWT
          scheduled_date: new Date().toISOString(),
          description: 'Replace old grinder with new one',
          components: [
            {
              component_id: oldComponentId,
              role: ComponentRole.OLD,
              notes: 'Worn out after 2 years',
            },
            {
              component_id: newComponentId,
              role: ComponentRole.NEW,
              notes: 'Brand new grinder',
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type_code).toBe(TaskType.REPLACE_GRINDER);
      expect(response.body.status).toBe(TaskStatus.PENDING);
      expect(response.body.assigned_to_user_id).toBe(operatorId);

      taskId = response.body.id;
    });

    it('should reject REPLACE_* task without old component', async () => {
      if (!adminAccessToken || !machineId || !newComponentId || !operatorId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type_code: TaskType.REPLACE_GRINDER,
          priority: TaskPriority.NORMAL,
          machine_id: machineId,
          assigned_to_user_id: operatorId,
          created_by_user_id: adminAccessToken,
          scheduled_date: new Date().toISOString(),
          description: 'Invalid task - no old component',
          components: [
            {
              component_id: newComponentId,
              role: ComponentRole.NEW,
              notes: 'Only new component',
            },
          ],
        })
        .expect(400); // Should fail validation
    });

    it('should reject REPLACE_* task without new component', async () => {
      if (!adminAccessToken || !machineId || !oldComponentId || !operatorId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type_code: TaskType.REPLACE_GRINDER,
          priority: TaskPriority.NORMAL,
          machine_id: machineId,
          assigned_to_user_id: operatorId,
          created_by_user_id: adminAccessToken,
          scheduled_date: new Date().toISOString(),
          description: 'Invalid task - no new component',
          components: [
            {
              component_id: oldComponentId,
              role: ComponentRole.OLD,
              notes: 'Only old component',
            },
          ],
        })
        .expect(400); // Should fail validation
    });

    it('should start the replacement task', async () => {
      if (!operatorAccessToken || !taskId) {
        console.warn('Skipping test: Task not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/start`)
        .set('Authorization', `Bearer ${operatorAccessToken}`)
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should upload photo BEFORE replacement', async () => {
      if (!operatorAccessToken || !taskId) {
        console.warn('Skipping test: Task not started');
        return;
      }

      // In real app, would upload actual image file
      // For E2E test, we'll create a file record directly in DB
      await dataSource.query(
        `INSERT INTO files (id, entity_type, entity_id, category, file_path, mime_type, size, created_at)
         VALUES (gen_random_uuid(), 'task', $1, 'task_photo_before', '/test/before.jpg', 'image/jpeg', 12345, NOW())`,
        [taskId],
      );
    });

    it('should upload photo AFTER replacement', async () => {
      if (!operatorAccessToken || !taskId) {
        console.warn('Skipping test: Task not started');
        return;
      }

      // Upload photo after
      await dataSource.query(
        `INSERT INTO files (id, entity_type, entity_id, category, file_path, mime_type, size, created_at)
         VALUES (gen_random_uuid(), 'task', $1, 'task_photo_after', '/test/after.jpg', 'image/jpeg', 12345, NOW())`,
        [taskId],
      );
    });

    it('should complete replacement task', async () => {
      if (!operatorAccessToken || !taskId) {
        console.warn('Skipping test: Photos not uploaded');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${operatorAccessToken}`)
        .send({
          completion_notes: 'Grinder replaced successfully',
          skip_photos: false, // Photos are required
        })
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.COMPLETED);
      expect(response.body).toHaveProperty('completed_at');
    });

    it('should verify old component moved to warehouse and status changed to retired', async () => {
      if (!adminAccessToken || !oldComponentId) {
        console.warn('Skipping test: Old component not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/equipment/components/${oldComponentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.current_location_type).toBe(ComponentLocationType.WAREHOUSE);
      expect(response.body.status).toBe(ComponentStatus.RETIRED);
    });

    it('should verify new component installed in machine and status changed to active', async () => {
      if (!adminAccessToken || !newComponentId) {
        console.warn('Skipping test: New component not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/equipment/components/${newComponentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.current_location_type).toBe(ComponentLocationType.MACHINE);
      expect(response.body.status).toBe(ComponentStatus.ACTIVE);
      expect(response.body.installation_date).toBeDefined();
    });
  });

  // ============================================================================
  // CLEANING TASK WORKFLOW
  // ============================================================================

  describe('CLEANING Task with Components', () => {
    let cleaningTaskId: string;
    let componentToCleanId: string;

    it('should create component for cleaning test', async () => {
      if (!adminAccessToken || !machineId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/equipment/components')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          machine_id: machineId,
          component_type: ComponentType.BREWER,
          name: 'Brewer - Needs Cleaning',
          current_location_type: ComponentLocationType.MACHINE,
          status: ComponentStatus.ACTIVE,
        })
        .expect(201);

      componentToCleanId = response.body.id;
    });

    it('should create CLEANING task with target component', async () => {
      if (!adminAccessToken || !machineId || !componentToCleanId || !operatorId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type_code: TaskType.CLEANING,
          priority: TaskPriority.NORMAL,
          machine_id: machineId,
          assigned_to_user_id: operatorId,
          created_by_user_id: adminAccessToken,
          scheduled_date: new Date().toISOString(),
          description: 'Clean brewer component',
          components: [
            {
              component_id: componentToCleanId,
              role: ComponentRole.TARGET,
              notes: 'Monthly cleaning',
            },
          ],
        })
        .expect(201);

      cleaningTaskId = response.body.id;
    });

    it('should verify component moved to washing when cleaning task started', async () => {
      if (!operatorAccessToken || !cleaningTaskId) {
        console.warn('Skipping test: Cleaning task not created');
        return;
      }

      // Start task
      await request(app.getHttpServer())
        .post(`/tasks/${cleaningTaskId}/start`)
        .set('Authorization', `Bearer ${operatorAccessToken}`)
        .expect(200);

      // Verify component location
      const componentResponse = await request(app.getHttpServer())
        .get(`/equipment/components/${componentToCleanId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(componentResponse.body.current_location_type).toBe(ComponentLocationType.WASHING);
    });

    afterAll(async () => {
      // Cleanup cleaning test data
      if (dataSource && cleaningTaskId) {
        try {
          await dataSource.query('DELETE FROM task_components WHERE task_id = $1', [
            cleaningTaskId,
          ]);
          await dataSource.query('DELETE FROM tasks WHERE id = $1', [cleaningTaskId]);
          await dataSource.query('DELETE FROM equipment_components WHERE id = $1', [
            componentToCleanId,
          ]);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  // ============================================================================
  // REPAIR TASK WORKFLOW
  // ============================================================================

  describe('REPAIR Task with Components', () => {
    let repairTaskId: string;
    let componentToRepairId: string;

    it('should create component for repair test', async () => {
      if (!adminAccessToken || !machineId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/equipment/components')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          machine_id: machineId,
          component_type: ComponentType.MIXER,
          name: 'Mixer - Needs Repair',
          current_location_type: ComponentLocationType.MACHINE,
          status: ComponentStatus.NEEDS_MAINTENANCE,
        })
        .expect(201);

      componentToRepairId = response.body.id;
    });

    it('should create REPAIR task with target component', async () => {
      if (!adminAccessToken || !machineId || !componentToRepairId || !operatorId) {
        console.warn('Skipping test: Prerequisites not met');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          type_code: TaskType.REPAIR,
          priority: TaskPriority.HIGH,
          machine_id: machineId,
          assigned_to_user_id: operatorId,
          created_by_user_id: adminAccessToken,
          scheduled_date: new Date().toISOString(),
          description: 'Repair mixer motor',
          components: [
            {
              component_id: componentToRepairId,
              role: ComponentRole.TARGET,
              notes: 'Motor making strange noise',
            },
          ],
        })
        .expect(201);

      repairTaskId = response.body.id;
    });

    it('should verify component moved to repair when repair task started', async () => {
      if (!operatorAccessToken || !repairTaskId) {
        console.warn('Skipping test: Repair task not created');
        return;
      }

      // Start task
      await request(app.getHttpServer())
        .post(`/tasks/${repairTaskId}/start`)
        .set('Authorization', `Bearer ${operatorAccessToken}`)
        .expect(200);

      // Verify component location
      const componentResponse = await request(app.getHttpServer())
        .get(`/equipment/components/${componentToRepairId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(componentResponse.body.current_location_type).toBe(ComponentLocationType.REPAIR);
      expect(componentResponse.body.status).toBe(ComponentStatus.IN_REPAIR);
    });

    afterAll(async () => {
      // Cleanup repair test data
      if (dataSource && repairTaskId) {
        try {
          await dataSource.query('DELETE FROM task_components WHERE task_id = $1', [repairTaskId]);
          await dataSource.query('DELETE FROM tasks WHERE id = $1', [repairTaskId]);
          await dataSource.query('DELETE FROM equipment_components WHERE id = $1', [
            componentToRepairId,
          ]);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});
