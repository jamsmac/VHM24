import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Role } from '../../modules/rbac/entities/role.entity';
import { Permission } from '../../modules/rbac/entities/permission.entity';

const logger = new Logger('RBACSeed');

/**
 * RBAC Seeder
 *
 * Creates base roles and permissions for VendHub Manager
 * REQ-AUTH-03, REQ-AUTH-04, REQ-AUTH-05
 */

interface PermissionData {
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface RoleData {
  name: string;
  description: string;
  permissions: string[]; // permission names
}

export async function seedRBAC(dataSource: DataSource): Promise<void> {
  logger.log('🔐 Seeding RBAC (Roles & Permissions)...');

  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // ============================================================================
  // PERMISSIONS DEFINITION
  // ============================================================================

  const permissionsData: PermissionData[] = [
    // Users
    { name: 'users:create', resource: 'users', action: 'create', description: 'Create new users' },
    { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
    {
      name: 'users:manage_roles',
      resource: 'users',
      action: 'execute',
      description: 'Assign/remove roles',
    },
    {
      name: 'users:block',
      resource: 'users',
      action: 'execute',
      description: 'Block/unblock users',
    },

    // Machines
    {
      name: 'machines:create',
      resource: 'machines',
      action: 'create',
      description: 'Create machines',
    },
    { name: 'machines:read', resource: 'machines', action: 'read', description: 'View machines' },
    {
      name: 'machines:update',
      resource: 'machines',
      action: 'update',
      description: 'Update machines',
    },
    {
      name: 'machines:delete',
      resource: 'machines',
      action: 'delete',
      description: 'Delete machines',
    },

    // Tasks
    { name: 'tasks:create', resource: 'tasks', action: 'create', description: 'Create tasks' },
    { name: 'tasks:read', resource: 'tasks', action: 'read', description: 'View tasks' },
    { name: 'tasks:update', resource: 'tasks', action: 'update', description: 'Update tasks' },
    { name: 'tasks:delete', resource: 'tasks', action: 'delete', description: 'Delete tasks' },
    {
      name: 'tasks:execute',
      resource: 'tasks',
      action: 'execute',
      description: 'Execute tasks (operators)',
    },
    { name: 'tasks:approve', resource: 'tasks', action: 'execute', description: 'Approve tasks' },

    // Inventory
    {
      name: 'inventory:create',
      resource: 'inventory',
      action: 'create',
      description: 'Create inventory',
    },
    {
      name: 'inventory:read',
      resource: 'inventory',
      action: 'read',
      description: 'View inventory',
    },
    {
      name: 'inventory:update',
      resource: 'inventory',
      action: 'update',
      description: 'Update inventory',
    },
    {
      name: 'inventory:delete',
      resource: 'inventory',
      action: 'delete',
      description: 'Delete inventory',
    },
    {
      name: 'inventory:transfer',
      resource: 'inventory',
      action: 'execute',
      description: 'Transfer inventory',
    },

    // Transactions
    {
      name: 'transactions:create',
      resource: 'transactions',
      action: 'create',
      description: 'Create transactions',
    },
    {
      name: 'transactions:read',
      resource: 'transactions',
      action: 'read',
      description: 'View transactions',
    },
    {
      name: 'transactions:update',
      resource: 'transactions',
      action: 'update',
      description: 'Update transactions',
    },
    {
      name: 'transactions:delete',
      resource: 'transactions',
      action: 'delete',
      description: 'Delete transactions',
    },

    // Incidents
    {
      name: 'incidents:create',
      resource: 'incidents',
      action: 'create',
      description: 'Create incidents',
    },
    {
      name: 'incidents:read',
      resource: 'incidents',
      action: 'read',
      description: 'View incidents',
    },
    {
      name: 'incidents:update',
      resource: 'incidents',
      action: 'update',
      description: 'Update incidents',
    },
    {
      name: 'incidents:delete',
      resource: 'incidents',
      action: 'delete',
      description: 'Delete incidents',
    },
    {
      name: 'incidents:resolve',
      resource: 'incidents',
      action: 'execute',
      description: 'Resolve incidents',
    },

    // Complaints
    {
      name: 'complaints:create',
      resource: 'complaints',
      action: 'create',
      description: 'Create complaints',
    },
    {
      name: 'complaints:read',
      resource: 'complaints',
      action: 'read',
      description: 'View complaints',
    },
    {
      name: 'complaints:update',
      resource: 'complaints',
      action: 'update',
      description: 'Update complaints',
    },
    {
      name: 'complaints:delete',
      resource: 'complaints',
      action: 'delete',
      description: 'Delete complaints',
    },

    // Reports
    { name: 'reports:view', resource: 'reports', action: 'read', description: 'View reports' },
    {
      name: 'reports:create',
      resource: 'reports',
      action: 'create',
      description: 'Create reports',
    },
    {
      name: 'reports:export',
      resource: 'reports',
      action: 'execute',
      description: 'Export reports',
    },

    // Analytics
    {
      name: 'analytics:view',
      resource: 'analytics',
      action: 'read',
      description: 'View analytics',
    },

    // Access Requests
    {
      name: 'access_requests:read',
      resource: 'access_requests',
      action: 'read',
      description: 'View access requests',
    },
    {
      name: 'access_requests:approve',
      resource: 'access_requests',
      action: 'execute',
      description: 'Approve access requests',
    },
    {
      name: 'access_requests:reject',
      resource: 'access_requests',
      action: 'execute',
      description: 'Reject access requests',
    },

    // Audit Logs
    {
      name: 'audit_logs:read',
      resource: 'audit_logs',
      action: 'read',
      description: 'View audit logs',
    },

    // RBAC Management
    { name: 'roles:create', resource: 'roles', action: 'create', description: 'Create roles' },
    { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
    { name: 'roles:update', resource: 'roles', action: 'update', description: 'Update roles' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
    {
      name: 'permissions:read',
      resource: 'permissions',
      action: 'read',
      description: 'View permissions',
    },

    // Locations
    {
      name: 'locations:create',
      resource: 'locations',
      action: 'create',
      description: 'Create locations',
    },
    {
      name: 'locations:read',
      resource: 'locations',
      action: 'read',
      description: 'View locations',
    },
    {
      name: 'locations:update',
      resource: 'locations',
      action: 'update',
      description: 'Update locations',
    },
    {
      name: 'locations:delete',
      resource: 'locations',
      action: 'delete',
      description: 'Delete locations',
    },

    // Equipment
    {
      name: 'equipment:create',
      resource: 'equipment',
      action: 'create',
      description: 'Create equipment',
    },
    {
      name: 'equipment:read',
      resource: 'equipment',
      action: 'read',
      description: 'View equipment',
    },
    {
      name: 'equipment:update',
      resource: 'equipment',
      action: 'update',
      description: 'Update equipment',
    },
    {
      name: 'equipment:delete',
      resource: 'equipment',
      action: 'delete',
      description: 'Delete equipment',
    },
    {
      name: 'equipment:maintain',
      resource: 'equipment',
      action: 'execute',
      description: 'Maintain equipment',
    },

    // Nomenclature (Products)
    {
      name: 'nomenclature:create',
      resource: 'nomenclature',
      action: 'create',
      description: 'Create products',
    },
    {
      name: 'nomenclature:read',
      resource: 'nomenclature',
      action: 'read',
      description: 'View products',
    },
    {
      name: 'nomenclature:update',
      resource: 'nomenclature',
      action: 'update',
      description: 'Update products',
    },
    {
      name: 'nomenclature:delete',
      resource: 'nomenclature',
      action: 'delete',
      description: 'Delete products',
    },
  ];

  // ============================================================================
  // ROLES DEFINITION
  // ============================================================================

  const rolesData: RoleData[] = [
    {
      name: 'Owner',
      description: 'Full system access - Owner of the system. Can manage everything including admins.',
      permissions: permissionsData.map((p) => p.name), // ALL permissions
    },
    {
      name: 'Admin',
      description:
        'Administrator - Can manage users, assign roles (except Owner), view audit logs',
      permissions: [
        // Users
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'users:manage_roles',
        'users:block',
        // Machines
        'machines:create',
        'machines:read',
        'machines:update',
        'machines:delete',
        // Tasks
        'tasks:create',
        'tasks:read',
        'tasks:update',
        'tasks:delete',
        'tasks:approve',
        // Inventory
        'inventory:create',
        'inventory:read',
        'inventory:update',
        'inventory:delete',
        'inventory:transfer',
        // Transactions
        'transactions:read',
        'transactions:update',
        'transactions:delete',
        // Incidents
        'incidents:read',
        'incidents:update',
        'incidents:resolve',
        // Complaints
        'complaints:read',
        'complaints:update',
        // Reports & Analytics
        'reports:view',
        'reports:create',
        'reports:export',
        'analytics:view',
        // Access Requests
        'access_requests:read',
        'access_requests:approve',
        'access_requests:reject',
        // Audit
        'audit_logs:read',
        // Locations
        'locations:create',
        'locations:read',
        'locations:update',
        'locations:delete',
        // Equipment
        'equipment:create',
        'equipment:read',
        'equipment:update',
        'equipment:delete',
        // Nomenclature
        'nomenclature:create',
        'nomenclature:read',
        'nomenclature:update',
        'nomenclature:delete',
      ],
    },
    {
      name: 'Manager',
      description: 'Operations Manager - Can manage tasks, inventory, view reports',
      permissions: [
        // Users (read only)
        'users:read',
        // Machines
        'machines:read',
        'machines:update',
        // Tasks
        'tasks:create',
        'tasks:read',
        'tasks:update',
        'tasks:approve',
        // Inventory
        'inventory:read',
        'inventory:update',
        'inventory:transfer',
        // Transactions
        'transactions:read',
        // Incidents
        'incidents:create',
        'incidents:read',
        'incidents:update',
        'incidents:resolve',
        // Complaints
        'complaints:create',
        'complaints:read',
        'complaints:update',
        // Reports & Analytics
        'reports:view',
        'reports:create',
        'reports:export',
        'analytics:view',
        // Locations
        'locations:read',
        // Equipment
        'equipment:read',
        'equipment:update',
        // Nomenclature
        'nomenclature:read',
      ],
    },
    {
      name: 'Operator',
      description: 'Field Operator - Can execute tasks (refill, collection), view machines',
      permissions: [
        // Machines (read only)
        'machines:read',
        // Tasks
        'tasks:read',
        'tasks:execute',
        // Inventory
        'inventory:read',
        'inventory:transfer',
        // Transactions (create for collections)
        'transactions:create',
        'transactions:read',
        // Incidents
        'incidents:create',
        'incidents:read',
        // Complaints
        'complaints:create',
        'complaints:read',
        // Equipment
        'equipment:read',
        // Nomenclature
        'nomenclature:read',
      ],
    },
    {
      name: 'Technician',
      description: 'Maintenance Technician - Can execute maintenance tasks, manage equipment',
      permissions: [
        // Machines
        'machines:read',
        'machines:update',
        // Tasks
        'tasks:read',
        'tasks:execute',
        // Incidents
        'incidents:create',
        'incidents:read',
        'incidents:update',
        'incidents:resolve',
        // Equipment
        'equipment:create',
        'equipment:read',
        'equipment:update',
        'equipment:maintain',
        // Nomenclature
        'nomenclature:read',
      ],
    },
    {
      name: 'Collector',
      description: 'Cash Collector - Can execute collection tasks, view transactions',
      permissions: [
        // Machines (read only)
        'machines:read',
        // Tasks (execute collection tasks)
        'tasks:read',
        'tasks:execute',
        // Transactions
        'transactions:create',
        'transactions:read',
        // Incidents
        'incidents:create',
        'incidents:read',
        // Nomenclature
        'nomenclature:read',
      ],
    },
    {
      name: 'Viewer',
      description: 'Read-only access - Can view most data but cannot modify',
      permissions: [
        // Users
        'users:read',
        // Machines
        'machines:read',
        // Tasks
        'tasks:read',
        // Inventory
        'inventory:read',
        // Transactions
        'transactions:read',
        // Incidents
        'incidents:read',
        // Complaints
        'complaints:read',
        // Reports & Analytics
        'reports:view',
        'analytics:view',
        // Locations
        'locations:read',
        // Equipment
        'equipment:read',
        // Nomenclature
        'nomenclature:read',
      ],
    },
  ];

  // ============================================================================
  // SEED PROCESS
  // ============================================================================

  try {
    // Check if already seeded
    const existingRoles = await roleRepository.count();
    if (existingRoles > 0) {
      logger.warn('⚠️  RBAC уже заполнен. Пропускаем...');
      return;
    }

    // Create permissions
    logger.log('   📝 Создание permissions...');
    const createdPermissions = new Map<string, Permission>();

    for (const permData of permissionsData) {
      const permission = permissionRepository.create(permData);
      const saved = await permissionRepository.save(permission);
      createdPermissions.set(permData.name, saved);
    }

    logger.log(`   ✅ Создано ${createdPermissions.size} permissions`);

    // Create roles with permissions
    logger.log('   👥 Создание roles...');
    let rolesCreated = 0;

    for (const roleData of rolesData) {
      // Get permission entities by names
      const rolePermissions = roleData.permissions
        .map((name) => createdPermissions.get(name))
        .filter(Boolean) as Permission[];

      // Create role
      const role = roleRepository.create({
        name: roleData.name,
        description: roleData.description,
        is_active: true,
        permissions: rolePermissions,
      });

      await roleRepository.save(role);
      rolesCreated++;

      logger.log(`   ✅ ${roleData.name}: ${rolePermissions.length} permissions`);
    }

    logger.log(`   ✅ Создано ${rolesCreated} roles`);
    logger.log('✅ RBAC seeding завершен\n');
  } catch (error) {
    logger.error('❌ Ошибка при seeding RBAC:', error);
    throw error;
  }
}
