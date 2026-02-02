# Module README Template для VendHub

## Стандартная структура README модуля

Каждый модуль в `backend/src/modules/` должен иметь README.md со следующей структурой:

```markdown
# [Module Name] Module

## Overview

Brief description of what this module does and its purpose in VendHub.

## Features

- Feature 1
- Feature 2
- Feature 3

## Architecture

```
module-name/
├── module-name.module.ts    # NestJS module definition
├── module-name.controller.ts # REST API endpoints
├── module-name.service.ts    # Business logic
├── entities/
│   └── entity.entity.ts     # TypeORM entities
├── dto/
│   ├── create-*.dto.ts      # Create DTOs
│   └── update-*.dto.ts      # Update DTOs
├── interfaces/
│   └── *.interface.ts       # TypeScript interfaces
└── README.md                # This file
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/resource | Get all resources | JWT |
| GET | /api/resource/:id | Get resource by ID | JWT |
| POST | /api/resource | Create resource | JWT + Admin |
| PATCH | /api/resource/:id | Update resource | JWT + Admin |
| DELETE | /api/resource/:id | Delete resource | JWT + Admin |

## Database Schema

```sql
CREATE TABLE resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Dependencies

- **Internal**: List other VendHub modules this depends on
- **External**: List npm packages used

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| FEATURE_FLAG | Enable/disable feature | false |

## Usage Examples

### Creating a resource

```typescript
// Using the service
const resource = await this.resourceService.create({
  name: 'Example',
  description: 'Description',
});
```

### API call example

```bash
curl -X POST https://api.vendhub.uz/api/resource \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Example", "description": "Description"}'
```

## Testing

```bash
# Run module tests
npm run test -- --testPathPattern=module-name

# Run with coverage
npm run test:cov -- --testPathPattern=module-name
```

## Related Modules

- [related-module](../related-module/README.md) - Description
- [another-module](../another-module/README.md) - Description
```

## Пример: Tasks Module

```markdown
# Tasks Module

## Overview

Manages all task types in VendHub: refill, collection, maintenance, and installation tasks. Supports task assignment, status tracking, and completion workflow with photo verification.

## Features

- Create and assign tasks to technicians
- Track task status (pending → in_progress → completed)
- Photo upload for task verification
- Task templates for quick creation
- Bulk task creation for routes
- Real-time status updates via WebSocket

## Architecture

```
tasks/
├── tasks.module.ts
├── tasks.controller.ts
├── tasks.service.ts
├── entities/
│   ├── task.entity.ts
│   ├── task-item.entity.ts
│   └── task-photo.entity.ts
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   ├── complete-task.dto.ts
│   └── task-query.dto.ts
├── enums/
│   ├── task-type.enum.ts
│   └── task-status.enum.ts
└── README.md
```

## API Endpoints

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | /api/tasks | Get all tasks (paginated) | JWT | All |
| GET | /api/tasks/:id | Get task by ID | JWT | All |
| POST | /api/tasks | Create new task | JWT | Admin, Manager |
| PATCH | /api/tasks/:id | Update task | JWT | Admin, Manager |
| POST | /api/tasks/:id/start | Start task | JWT | Technician |
| POST | /api/tasks/:id/complete | Complete task | JWT | Technician |
| POST | /api/tasks/:id/photos | Upload task photo | JWT | Technician |
| DELETE | /api/tasks/:id | Delete task | JWT | Admin |

## Database Schema

```sql
-- Task types
CREATE TYPE task_type AS ENUM ('refill', 'collection', 'maintenance', 'installation');
CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type task_type NOT NULL,
  status task_status DEFAULT 'pending',
  machine_id UUID REFERENCES machines(id),
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  description TEXT,
  priority INT DEFAULT 5,
  due_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  planned_quantity INT NOT NULL,
  actual_quantity INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  type VARCHAR(50), -- 'before', 'after', 'issue'
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

## Dependencies

- **Internal**: machines, users, products, photos, notifications
- **External**: @nestjs/typeorm, class-validator, class-transformer

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| TASK_AUTO_ASSIGN | Auto-assign tasks to available technician | false |
| TASK_PHOTO_REQUIRED | Require photo on completion | true |
| TASK_MAX_DURATION_HOURS | Max task duration before alert | 8 |

## Usage Examples

### Creating a refill task

```typescript
const task = await tasksService.create({
  type: TaskType.REFILL,
  machineId: '550e8400-e29b-41d4-a716-446655440000',
  assignedTo: 'technician-uuid',
  items: [
    { productId: 'coffee-uuid', plannedQuantity: 50 },
    { productId: 'milk-uuid', plannedQuantity: 20 },
  ],
  dueDate: new Date('2025-02-03'),
});
```

### Completing a task

```typescript
await tasksService.complete(taskId, {
  items: [
    { productId: 'coffee-uuid', actualQuantity: 48 },
    { productId: 'milk-uuid', actualQuantity: 20 },
  ],
  notes: 'Completed successfully',
});
```

## Testing

```bash
# Run task module tests
npm run test -- --testPathPattern=tasks

# Run e2e tests
npm run test:e2e -- --testPathPattern=tasks
```

## Related Modules

- [machines](../machines/README.md) - Machine management
- [users](../users/README.md) - User and technician management
- [products](../products/README.md) - Product catalog
- [notifications](../notifications/README.md) - Task notifications
```

## CLI для генерации README

```bash
#!/bin/bash
# scripts/generate-module-readme.sh

MODULE_NAME=$1
MODULE_PATH="backend/src/modules/$MODULE_NAME"

if [ -z "$MODULE_NAME" ]; then
  echo "Usage: $0 <module-name>"
  exit 1
fi

if [ ! -d "$MODULE_PATH" ]; then
  echo "Module not found: $MODULE_PATH"
  exit 1
fi

# Generate README from template
cat > "$MODULE_PATH/README.md" << EOF
# ${MODULE_NAME^} Module

## Overview

[Brief description]

## Features

- Feature 1
- Feature 2

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/${MODULE_NAME} | Get all | JWT |

## Database Schema

\`\`\`sql
-- Add schema here
\`\`\`

## Testing

\`\`\`bash
npm run test -- --testPathPattern=${MODULE_NAME}
\`\`\`
EOF

echo "Created: $MODULE_PATH/README.md"
```
