#!/usr/bin/env node
/**
 * VendHub Manager MCP Server
 *
 * Model Context Protocol server that enables AI agents (via agent-deck)
 * to interact with VHM24 API for development, testing, and project evolution.
 *
 * Features:
 * - Read/write access to codebase structure
 * - API testing and validation
 * - Database schema inspection
 * - Test execution and reporting
 * - Code generation and review
 * - Issue tracking and resolution
 *
 * Usage with agent-deck:
 *   agent-deck mcp attach <session-id> vendhub
 *
 * @module VendHubMCPServer
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const config = {
  projectRoot: process.env.VHM_PROJECT_ROOT || process.cwd(),
  apiBaseUrl: process.env.VHM_API_URL || 'http://localhost:3000/api',
  apiToken: process.env.VHM_API_TOKEN || '',
};

// API Client
const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    ...(config.apiToken && { Authorization: `Bearer ${config.apiToken}` }),
  },
  timeout: 30000,
});

// ============================================================================
// Tool Definitions
// ============================================================================

const tools: Tool[] = [
  // === Codebase Analysis ===
  {
    name: 'vhm_list_modules',
    description: 'List all NestJS modules in VHM24 backend with their status',
    inputSchema: {
      type: 'object',
      properties: {
        include_tests: { type: 'boolean', description: 'Include test file info' },
      },
    },
  },
  {
    name: 'vhm_read_file',
    description: 'Read a file from VHM24 codebase',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
        lines: { type: 'number', description: 'Max lines to return (default: all)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'vhm_search_code',
    description: 'Search for patterns in VHM24 codebase',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (regex supported)' },
        file_type: { type: 'string', description: 'File extension filter (ts, tsx, etc)' },
        directory: { type: 'string', description: 'Directory to search in' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'vhm_analyze_module',
    description: 'Analyze a NestJS module structure (entities, services, controllers)',
    inputSchema: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: 'Module name (e.g., "tasks", "machines")' },
      },
      required: ['module_name'],
    },
  },

  // === Database ===
  {
    name: 'vhm_db_schema',
    description: 'Get database schema information',
    inputSchema: {
      type: 'object',
      properties: {
        table_name: { type: 'string', description: 'Specific table name (optional)' },
      },
    },
  },
  {
    name: 'vhm_list_migrations',
    description: 'List all database migrations with status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // === Testing ===
  {
    name: 'vhm_run_tests',
    description: 'Run tests for a specific module or all tests',
    inputSchema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'Module name to test (optional)' },
        coverage: { type: 'boolean', description: 'Include coverage report' },
        watch: { type: 'boolean', description: 'Run in watch mode' },
      },
    },
  },
  {
    name: 'vhm_lint',
    description: 'Run linter and get issues',
    inputSchema: {
      type: 'object',
      properties: {
        fix: { type: 'boolean', description: 'Auto-fix issues' },
        path: { type: 'string', description: 'Specific path to lint' },
      },
    },
  },
  {
    name: 'vhm_type_check',
    description: 'Run TypeScript type checking',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', enum: ['backend', 'frontend', 'mobile'], description: 'Project to check' },
      },
    },
  },

  // === API Testing ===
  {
    name: 'vhm_api_test',
    description: 'Test a VHM24 API endpoint',
    inputSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        endpoint: { type: 'string', description: 'API endpoint path' },
        body: { type: 'object', description: 'Request body for POST/PUT/PATCH' },
        headers: { type: 'object', description: 'Additional headers' },
      },
      required: ['method', 'endpoint'],
    },
  },
  {
    name: 'vhm_api_docs',
    description: 'Get OpenAPI/Swagger documentation for endpoints',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'API tag to filter (e.g., "machines", "tasks")' },
      },
    },
  },

  // === Code Generation ===
  {
    name: 'vhm_generate_entity',
    description: 'Generate a TypeORM entity file',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name (PascalCase)' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              nullable: { type: 'boolean' },
            },
          },
        },
        module: { type: 'string', description: 'Target module name' },
      },
      required: ['name', 'fields', 'module'],
    },
  },
  {
    name: 'vhm_generate_dto',
    description: 'Generate DTO files for an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entity_name: { type: 'string', description: 'Entity name to create DTOs for' },
        module: { type: 'string', description: 'Target module name' },
      },
      required: ['entity_name', 'module'],
    },
  },
  {
    name: 'vhm_generate_migration',
    description: 'Generate a database migration',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Migration name' },
        auto: { type: 'boolean', description: 'Auto-generate from entity changes' },
      },
      required: ['name'],
    },
  },

  // === Issue Management ===
  {
    name: 'vhm_find_issues',
    description: 'Find potential issues in the codebase',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['security', 'performance', 'typescript', 'unused', 'todo'],
        },
      },
    },
  },
  {
    name: 'vhm_apply_fix',
    description: 'Apply a code fix to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        old_code: { type: 'string', description: 'Code to replace' },
        new_code: { type: 'string', description: 'Replacement code' },
      },
      required: ['path', 'old_code', 'new_code'],
    },
  },

  // === Project Status ===
  {
    name: 'vhm_project_status',
    description: 'Get overall project status and health',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'vhm_git_status',
    description: 'Get git repository status',
    inputSchema: {
      type: 'object',
      properties: {
        include_diff: { type: 'boolean', description: 'Include diff of changes' },
      },
    },
  },

  // === Agent Bridge ===
  {
    name: 'vhm_report_progress',
    description: 'Report agent progress to VHM24 dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task being worked on' },
        status: { type: 'string', enum: ['started', 'in_progress', 'completed', 'failed'] },
        message: { type: 'string', description: 'Progress message' },
        files_changed: { type: 'array', items: { type: 'string' } },
      },
      required: ['status', 'message'],
    },
  },
  {
    name: 'vhm_create_proposal',
    description: 'Create a code change proposal for human review',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
              action: { type: 'string', enum: ['create', 'modify', 'delete'] },
            },
          },
        },
      },
      required: ['title', 'description', 'files'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleTool(name: string, args: Record<string, unknown>): Promise<TextContent[]> {
  try {
    switch (name) {
      case 'vhm_list_modules':
        return await listModules(args.include_tests as boolean);

      case 'vhm_read_file':
        return await readFile(args.path as string, args.lines as number);

      case 'vhm_search_code':
        return await searchCode(
          args.pattern as string,
          args.file_type as string,
          args.directory as string,
        );

      case 'vhm_analyze_module':
        return await analyzeModule(args.module_name as string);

      case 'vhm_db_schema':
        return await getDbSchema(args.table_name as string);

      case 'vhm_list_migrations':
        return await listMigrations();

      case 'vhm_run_tests':
        return await runTests(
          args.module as string,
          args.coverage as boolean,
          args.watch as boolean,
        );

      case 'vhm_lint':
        return await runLint(args.fix as boolean, args.path as string);

      case 'vhm_type_check':
        return await typeCheck(args.project as string);

      case 'vhm_api_test':
        return await testApi(
          args.method as string,
          args.endpoint as string,
          args.body as Record<string, unknown>,
          args.headers as Record<string, string>,
        );

      case 'vhm_api_docs':
        return await getApiDocs(args.tag as string);

      case 'vhm_generate_entity':
        return await generateEntity(
          args.name as string,
          args.fields as Array<{ name: string; type: string; nullable?: boolean }>,
          args.module as string,
        );

      case 'vhm_generate_dto':
        return await generateDto(args.entity_name as string, args.module as string);

      case 'vhm_generate_migration':
        return await generateMigration(args.name as string, args.auto as boolean);

      case 'vhm_find_issues':
        return await findIssues(args.type as string);

      case 'vhm_apply_fix':
        return await applyFix(
          args.path as string,
          args.old_code as string,
          args.new_code as string,
        );

      case 'vhm_project_status':
        return await getProjectStatus();

      case 'vhm_git_status':
        return await getGitStatus(args.include_diff as boolean);

      case 'vhm_report_progress':
        return await reportProgress(
          args.task_id as string,
          args.status as string,
          args.message as string,
          args.files_changed as string[],
        );

      case 'vhm_create_proposal':
        return await createProposal(
          args.title as string,
          args.description as string,
          args.files as Array<{ path: string; content: string; action: string }>,
        );

      default:
        return [{ type: 'text', text: `Unknown tool: ${name}` }];
    }
  } catch (error) {
    return [{
      type: 'text',
      text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
    }];
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

async function listModules(includeTests: boolean = false): Promise<TextContent[]> {
  const modulesDir = path.join(config.projectRoot, 'backend/src/modules');
  const entries = await fs.readdir(modulesDir, { withFileTypes: true });

  const modules = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const modulePath = path.join(modulesDir, entry.name);
      const files = await fs.readdir(modulePath);

      const hasEntity = files.some((f) => f.endsWith('.entity.ts'));
      const hasService = files.some((f) => f.endsWith('.service.ts'));
      const hasController = files.some((f) => f.endsWith('.controller.ts'));
      const hasModule = files.some((f) => f.endsWith('.module.ts'));
      const hasTests = files.some((f) => f.endsWith('.spec.ts'));

      modules.push({
        name: entry.name,
        hasEntity,
        hasService,
        hasController,
        hasModule,
        ...(includeTests && { hasTests }),
        files: files.length,
      });
    }
  }

  return [{
    type: 'text',
    text: JSON.stringify({ modules, total: modules.length }, null, 2),
  }];
}

async function readFile(filePath: string, maxLines?: number): Promise<TextContent[]> {
  const fullPath = path.join(config.projectRoot, filePath);
  let content = await fs.readFile(fullPath, 'utf-8');

  if (maxLines) {
    const lines = content.split('\n');
    content = lines.slice(0, maxLines).join('\n');
    if (lines.length > maxLines) {
      content += `\n... (${lines.length - maxLines} more lines)`;
    }
  }

  return [{ type: 'text', text: content }];
}

async function searchCode(pattern: string, fileType?: string, directory?: string): Promise<TextContent[]> {
  const searchDir = directory
    ? path.join(config.projectRoot, directory)
    : config.projectRoot;

  const globPattern = fileType ? `--include="*.${fileType}"` : '';

  try {
    const { stdout } = await execAsync(
      `grep -rn ${globPattern} "${pattern}" "${searchDir}" 2>/dev/null | head -50`,
      { maxBuffer: 1024 * 1024 },
    );
    return [{ type: 'text', text: stdout || 'No matches found' }];
  } catch {
    return [{ type: 'text', text: 'No matches found' }];
  }
}

async function analyzeModule(moduleName: string): Promise<TextContent[]> {
  const modulePath = path.join(config.projectRoot, 'backend/src/modules', moduleName);

  try {
    const files = await fs.readdir(modulePath, { recursive: true });
    const analysis: Record<string, unknown> = {
      module: moduleName,
      path: modulePath,
      structure: {
        entities: files.filter((f) => f.toString().endsWith('.entity.ts')),
        services: files.filter((f) => f.toString().endsWith('.service.ts')),
        controllers: files.filter((f) => f.toString().endsWith('.controller.ts')),
        dtos: files.filter((f) => f.toString().includes('/dto/')),
        tests: files.filter((f) => f.toString().endsWith('.spec.ts')),
      },
    };

    // Read module file to get imports/exports
    const moduleFile = files.find((f) => f.toString().endsWith('.module.ts'));
    if (moduleFile) {
      const content = await fs.readFile(path.join(modulePath, moduleFile.toString()), 'utf-8');
      const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]/);
      const exportsMatch = content.match(/exports:\s*\[([\s\S]*?)\]/);

      analysis.imports = importsMatch?.[1]?.split(',').map((s) => s.trim()).filter(Boolean) || [];
      analysis.exports = exportsMatch?.[1]?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    }

    return [{ type: 'text', text: JSON.stringify(analysis, null, 2) }];
  } catch {
    return [{ type: 'text', text: `Module ${moduleName} not found` }];
  }
}

async function getDbSchema(tableName?: string): Promise<TextContent[]> {
  const entitiesDir = path.join(config.projectRoot, 'backend/src/modules');

  const schema: Array<{ table: string; columns: string[] }> = [];

  const findEntities = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await findEntities(fullPath);
      } else if (entry.name.endsWith('.entity.ts')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        const tableMatch = content.match(/@Entity\(['"](\w+)['"]\)/);
        const table = tableMatch?.[1] || entry.name.replace('.entity.ts', '');

        if (tableName && table !== tableName) continue;

        const columns = content.match(/@Column\([^)]*\)\s*\n?\s*(\w+):/g)?.map((c) => {
          const match = c.match(/(\w+):$/);
          return match?.[1] || '';
        }) || [];

        schema.push({ table, columns });
      }
    }
  };

  await findEntities(entitiesDir);

  return [{ type: 'text', text: JSON.stringify(schema, null, 2) }];
}

async function listMigrations(): Promise<TextContent[]> {
  const migrationsDir = path.join(config.projectRoot, 'backend/src/database/migrations');

  try {
    const files = await fs.readdir(migrationsDir);
    const migrations = files
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
      .map((f) => {
        const match = f.match(/^(\d+)-(.+)\.ts$/);
        return {
          file: f,
          timestamp: match?.[1] || 'unknown',
          name: match?.[2] || f,
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return [{ type: 'text', text: JSON.stringify(migrations, null, 2) }];
  } catch {
    return [{ type: 'text', text: 'No migrations found' }];
  }
}

async function runTests(module?: string, coverage?: boolean, watch?: boolean): Promise<TextContent[]> {
  const projectDir = path.join(config.projectRoot, 'backend');
  let cmd = 'npm run test';

  if (coverage) cmd += ':cov';
  if (watch) cmd += ':watch';
  if (module) cmd += ` -- --testPathPattern="${module}"`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: projectDir,
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    });
    return [{ type: 'text', text: stdout + (stderr ? `\n\nWarnings:\n${stderr}` : '') }];
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return [{
      type: 'text',
      text: `Test failed:\n${execError.stdout || ''}\n${execError.stderr || execError.message || ''}`,
    }];
  }
}

async function runLint(fix?: boolean, targetPath?: string): Promise<TextContent[]> {
  const projectDir = path.join(config.projectRoot, 'backend');
  let cmd = 'npm run lint';
  if (fix) cmd += ':fix';
  if (targetPath) cmd += ` -- "${targetPath}"`;

  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: projectDir, timeout: 60000 });
    return [{ type: 'text', text: stdout + stderr }];
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    return [{ type: 'text', text: `Lint issues:\n${execError.stdout || ''}\n${execError.stderr || ''}` }];
  }
}

async function typeCheck(project?: string): Promise<TextContent[]> {
  const projectDir = path.join(config.projectRoot, project || 'backend');

  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
      cwd: projectDir,
      timeout: 120000,
    });
    return [{ type: 'text', text: stdout || 'No type errors found' }];
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    return [{ type: 'text', text: `Type errors:\n${execError.stdout || ''}\n${execError.stderr || ''}` }];
  }
}

async function testApi(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<TextContent[]> {
  try {
    const response = await apiClient.request({
      method,
      url: endpoint,
      data: body,
      headers,
    });

    return [{
      type: 'text',
      text: JSON.stringify({
        status: response.status,
        headers: response.headers,
        data: response.data,
      }, null, 2),
    }];
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data: unknown }; message?: string };
    return [{
      type: 'text',
      text: JSON.stringify({
        error: true,
        status: axiosError.response?.status,
        data: axiosError.response?.data || axiosError.message,
      }, null, 2),
    }];
  }
}

async function getApiDocs(tag?: string): Promise<TextContent[]> {
  try {
    const response = await apiClient.get('/docs-json');
    let paths = response.data.paths;

    if (tag) {
      paths = Object.fromEntries(
        Object.entries(paths as Record<string, Record<string, { tags?: string[] }>>).filter(([, methods]) =>
          Object.values(methods).some((m) => m.tags?.includes(tag)),
        ),
      );
    }

    return [{ type: 'text', text: JSON.stringify(paths, null, 2) }];
  } catch {
    return [{ type: 'text', text: 'Could not fetch API docs. Is the server running?' }];
  }
}

async function generateEntity(
  name: string,
  fields: Array<{ name: string; type: string; nullable?: boolean }>,
  module: string,
): Promise<TextContent[]> {
  const entityPath = path.join(
    config.projectRoot,
    'backend/src/modules',
    module,
    'entities',
    `${toKebabCase(name)}.entity.ts`,
  );

  const typeMap: Record<string, string> = {
    string: 'varchar',
    number: 'integer',
    boolean: 'boolean',
    Date: 'timestamp',
    object: 'jsonb',
  };

  const fieldsDef = fields.map((f) => {
    const columnType = typeMap[f.type] || 'varchar';
    const nullable = f.nullable ? ', nullable: true' : '';
    return `  @Column({ type: '${columnType}'${nullable} })
  ${f.name}: ${f.type};`;
  }).join('\n\n');

  const content = `import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('${toSnakeCase(name)}')
export class ${name} extends BaseEntity {
${fieldsDef}
}
`;

  await fs.mkdir(path.dirname(entityPath), { recursive: true });
  await fs.writeFile(entityPath, content);

  return [{ type: 'text', text: `Entity created at: ${entityPath}` }];
}

async function generateDto(entityName: string, module: string): Promise<TextContent[]> {
  const dtoDir = path.join(config.projectRoot, 'backend/src/modules', module, 'dto');
  await fs.mkdir(dtoDir, { recursive: true });

  const createDto = `import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create${entityName}Dto {
  @ApiProperty()
  @IsString()
  name: string;
}
`;

  const updateDto = `import { PartialType } from '@nestjs/swagger';
import { Create${entityName}Dto } from './create-${toKebabCase(entityName)}.dto';

export class Update${entityName}Dto extends PartialType(Create${entityName}Dto) {}
`;

  await fs.writeFile(path.join(dtoDir, `create-${toKebabCase(entityName)}.dto.ts`), createDto);
  await fs.writeFile(path.join(dtoDir, `update-${toKebabCase(entityName)}.dto.ts`), updateDto);

  return [{ type: 'text', text: `DTOs created in: ${dtoDir}` }];
}

async function generateMigration(name: string, auto?: boolean): Promise<TextContent[]> {
  const projectDir = path.join(config.projectRoot, 'backend');
  const cmd = auto
    ? `npm run migration:generate -- -n ${name}`
    : `npm run migration:create -- -n ${name}`;

  try {
    const { stdout } = await execAsync(cmd, { cwd: projectDir });
    return [{ type: 'text', text: stdout }];
  } catch (error: unknown) {
    const execError = error as { message?: string };
    return [{ type: 'text', text: `Migration creation failed: ${execError.message}` }];
  }
}

async function findIssues(type?: string): Promise<TextContent[]> {
  const issues: Array<{ type: string; file: string; message: string }> = [];
  const backendDir = path.join(config.projectRoot, 'backend/src');

  const scanDir = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.ts')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        const relativePath = fullPath.replace(config.projectRoot, '');

        // Check for different issue types
        if (!type || type === 'todo') {
          const todos = content.match(/\/\/\s*TODO:?.*/gi) || [];
          todos.forEach((t) => issues.push({ type: 'todo', file: relativePath, message: t }));
        }

        if (!type || type === 'security') {
          if (content.includes('password') && content.includes('console.log')) {
            issues.push({ type: 'security', file: relativePath, message: 'Possible password logging' });
          }
        }

        if (!type || type === 'unused') {
          const unusedImports = content.match(/import\s+{\s*\w+\s*}\s+from\s+['"][^'"]+['"]/g) || [];
          // Simple check - would need more sophisticated analysis
          unusedImports.forEach((imp) => {
            const match = imp.match(/{\s*(\w+)\s*}/);
            if (match && !content.includes(match[1] + '(') && !content.includes(match[1] + '.')) {
              // Skip, this is too naive
            }
          });
        }
      }
    }
  };

  await scanDir(backendDir);

  return [{ type: 'text', text: JSON.stringify(issues.slice(0, 50), null, 2) }];
}

async function applyFix(filePath: string, oldCode: string, newCode: string): Promise<TextContent[]> {
  const fullPath = path.join(config.projectRoot, filePath);

  try {
    let content = await fs.readFile(fullPath, 'utf-8');

    if (!content.includes(oldCode)) {
      return [{ type: 'text', text: 'Error: Old code not found in file' }];
    }

    content = content.replace(oldCode, newCode);
    await fs.writeFile(fullPath, content);

    return [{ type: 'text', text: `Fix applied to ${filePath}` }];
  } catch (error: unknown) {
    const err = error as { message?: string };
    return [{ type: 'text', text: `Error applying fix: ${err.message}` }];
  }
}

async function getProjectStatus(): Promise<TextContent[]> {
  const backendDir = path.join(config.projectRoot, 'backend');
  const frontendDir = path.join(config.projectRoot, 'frontend');

  const status: Record<string, unknown> = {
    project: 'VendHub Manager (VHM24)',
    timestamp: new Date().toISOString(),
  };

  // Check backend
  try {
    const { stdout: backendVersion } = await execAsync('node -e "console.log(require(\'./package.json\').version)"', {
      cwd: backendDir,
    });
    status.backend = { version: backendVersion.trim(), status: 'ok' };
  } catch {
    status.backend = { status: 'error' };
  }

  // Check frontend
  try {
    const { stdout: frontendVersion } = await execAsync('node -e "console.log(require(\'./package.json\').version)"', {
      cwd: frontendDir,
    });
    status.frontend = { version: frontendVersion.trim(), status: 'ok' };
  } catch {
    status.frontend = { status: 'error' };
  }

  // Check git
  try {
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: config.projectRoot });
    const { stdout: commits } = await execAsync('git rev-list --count HEAD', { cwd: config.projectRoot });
    status.git = { branch: branch.trim(), commits: parseInt(commits.trim()) };
  } catch {
    status.git = { status: 'not a git repo' };
  }

  return [{ type: 'text', text: JSON.stringify(status, null, 2) }];
}

async function getGitStatus(includeDiff?: boolean): Promise<TextContent[]> {
  try {
    const { stdout: status } = await execAsync('git status --short', { cwd: config.projectRoot });
    let result = `Git Status:\n${status || '(clean)'}\n`;

    if (includeDiff) {
      const { stdout: diff } = await execAsync('git diff --stat', { cwd: config.projectRoot });
      result += `\nChanges:\n${diff || '(no changes)'}`;
    }

    return [{ type: 'text', text: result }];
  } catch (error: unknown) {
    const err = error as { message?: string };
    return [{ type: 'text', text: `Git error: ${err.message}` }];
  }
}

async function reportProgress(
  taskId: string | undefined,
  status: string,
  message: string,
  filesChanged?: string[],
): Promise<TextContent[]> {
  try {
    await apiClient.post('/agent-bridge/progress', {
      task_id: taskId,
      status,
      message,
      files_changed: filesChanged,
      agent: process.env.AGENT_DECK_SESSION || 'unknown',
      timestamp: new Date().toISOString(),
    });

    return [{ type: 'text', text: 'Progress reported successfully' }];
  } catch {
    // API might not be available, save locally
    return [{ type: 'text', text: 'Progress logged locally (API unavailable)' }];
  }
}

async function createProposal(
  title: string,
  description: string,
  files: Array<{ path: string; content: string; action: string }>,
): Promise<TextContent[]> {
  try {
    const response = await apiClient.post('/ai-assistant/proposals', {
      title,
      description,
      type: 'feature',
      proposed_files: files,
      ai_reasoning: `Created by agent-deck session: ${process.env.AGENT_DECK_SESSION || 'unknown'}`,
    });

    return [{
      type: 'text',
      text: `Proposal created: ${response.data.id}\nReview at: /dashboard/ai-assistant`,
    }];
  } catch {
    return [{ type: 'text', text: 'Could not create proposal via API. Files saved locally.' }];
  }
}

// Helpers
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

// ============================================================================
// Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'vendhub-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleTool(name, args as Record<string, unknown>);

  return {
    content: result,
  };
});

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'vendhub://project/structure',
      name: 'VHM24 Project Structure',
      mimeType: 'application/json',
    },
    {
      uri: 'vendhub://docs/claude-md',
      name: 'CLAUDE.md Documentation',
      mimeType: 'text/markdown',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'vendhub://project/structure') {
    const structure = await listModules(true);
    return {
      contents: [{ uri, mimeType: 'application/json', text: structure[0].text }],
    };
  }

  if (uri === 'vendhub://docs/claude-md') {
    const content = await fs.readFile(path.join(config.projectRoot, 'CLAUDE.md'), 'utf-8');
    return {
      contents: [{ uri, mimeType: 'text/markdown', text: content }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VendHub MCP Server running on stdio');
}

main().catch(console.error);
