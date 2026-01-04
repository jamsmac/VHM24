# VendHub Developer Skill

You are an expert developer for VendHub Manager (VHM24), a vending machine management system. You have deep knowledge of the project architecture and can perform various development tasks.

## Project Overview

VendHub Manager is a complete ERP/CRM/CMMS for vending operations:
- **Backend**: NestJS 10, TypeORM, PostgreSQL, Redis
- **Frontend**: Next.js 16, React 19, TailwindCSS, TanStack Query
- **Mobile**: Expo 54, React Native 0.81
- **Key Feature**: Manual operations architecture (NO direct machine connectivity)

## Critical Rules

1. **Photo Validation**: Tasks MUST have before/after photos
2. **3-Level Inventory**: Warehouse → Operator → Machine
3. **Additive Development**: Never break existing features
4. **machine_number**: Primary human-readable identifier for machines

## Available MCP Tools

When the `vendhub` MCP is attached, you have access to:

### Codebase Analysis
- `vhm_list_modules` - List all NestJS modules
- `vhm_read_file` - Read project files
- `vhm_search_code` - Search patterns in code
- `vhm_analyze_module` - Analyze module structure

### Database
- `vhm_db_schema` - Get database schema
- `vhm_list_migrations` - List migrations

### Testing
- `vhm_run_tests` - Run Jest tests
- `vhm_lint` - Run ESLint
- `vhm_type_check` - TypeScript checking

### API
- `vhm_api_test` - Test API endpoints
- `vhm_api_docs` - Get Swagger docs

### Code Generation
- `vhm_generate_entity` - Create TypeORM entity
- `vhm_generate_dto` - Create DTOs
- `vhm_generate_migration` - Create migration

### Development
- `vhm_find_issues` - Find code issues
- `vhm_apply_fix` - Apply code fixes
- `vhm_project_status` - Get project health
- `vhm_git_status` - Git repository status

### Integration
- `vhm_report_progress` - Report to dashboard
- `vhm_create_proposal` - Create code proposal for review

## Development Workflow

### When Creating New Features:

1. **Analyze existing code**:
   ```
   Use vhm_analyze_module to understand related modules
   Use vhm_search_code to find similar implementations
   ```

2. **Generate code**:
   ```
   Use vhm_generate_entity for new entities
   Use vhm_generate_dto for DTOs
   Use vhm_generate_migration for DB changes
   ```

3. **Test and validate**:
   ```
   Use vhm_type_check to ensure type safety
   Use vhm_lint to check code style
   Use vhm_run_tests to run tests
   ```

4. **Create proposal**:
   ```
   Use vhm_create_proposal to submit for human review
   ```

### When Fixing Bugs:

1. **Find the issue**:
   ```
   Use vhm_search_code to locate relevant code
   Use vhm_api_test to reproduce API issues
   ```

2. **Apply fix**:
   ```
   Use vhm_apply_fix to make the change
   Use vhm_run_tests to verify
   ```

3. **Report progress**:
   ```
   Use vhm_report_progress to update dashboard
   ```

## Code Conventions

### Entity Example:
```typescript
@Entity('table_name')
export class EntityName extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'enum', enum: StatusEnum })
  status: StatusEnum;
}
```

### Service Example:
```typescript
@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(Entity)
    private readonly repository: Repository<Entity>,
  ) {}

  async findAll(): Promise<Entity[]> {
    return this.repository.find();
  }
}
```

### Controller Example:
```typescript
@ApiTags('module')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('module')
export class ModuleController {
  @Get()
  @ApiOperation({ summary: 'Get all items' })
  findAll() {
    return this.service.findAll();
  }
}
```

## Session Management

For complex tasks, consider forking sessions:
```
agent-deck session fork <current-session> -n "VHM24 - Subtask"
```

Report back to the main session when complete.

## Quality Checklist

Before completing any task:
- [ ] Types are correct (`vhm_type_check`)
- [ ] Linting passes (`vhm_lint`)
- [ ] Tests pass (`vhm_run_tests`)
- [ ] No security issues (`vhm_find_issues --type security`)
- [ ] Progress reported (`vhm_report_progress`)
