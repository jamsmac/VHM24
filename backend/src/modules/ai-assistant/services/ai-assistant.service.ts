/**
 * AI Assistant Service
 *
 * Core service for AI-powered integration and documentation generation.
 * Uses OpenAI/Anthropic for intelligent code generation and analysis.
 *
 * @module AiAssistantModule
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  IntegrationProposal,
  IntegrationProposalStatus,
  IntegrationProposalType,
  ProposedFile,
  ApiEndpointInfo,
} from '../entities/integration-proposal.entity';
import { AiProviderKeyService } from '../../settings/services/ai-provider-key.service';
import { AiProvider } from '../../settings/entities/ai-provider-key.entity';
import {
  AnalyzeApiDto,
  GenerateDocumentationDto,
  GenerateModuleDto,
  AiChatDto,
  ReviewProposalDto,
  FixCodeDto,
  ListProposalsQueryDto,
} from '../dto/ai-assistant.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationContext {
  messages: AiMessage[];
  created_at: Date;
  last_activity: Date;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly conversations = new Map<string, ConversationContext>();
  private readonly projectRoot = process.cwd();

  constructor(
    @InjectRepository(IntegrationProposal)
    private readonly proposalRepository: Repository<IntegrationProposal>,
    private readonly aiProviderKeyService: AiProviderKeyService,
  ) {}

  // ============================================================================
  // API Analysis
  // ============================================================================

  /**
   * Analyze external API documentation and create integration proposal
   */
  async analyzeApi(dto: AnalyzeApiDto, userId: string): Promise<IntegrationProposal> {
    this.logger.log(`Analyzing API: ${dto.documentation_url}`);

    // 1. Fetch documentation
    const documentation = await this.fetchDocumentation(dto.documentation_url);

    // 2. Parse and extract endpoints (try OpenAPI first, then AI analysis)
    let endpoints: ApiEndpointInfo[];
    let isOpenApi = false;

    try {
      const openApiSpec = JSON.parse(documentation);
      if (openApiSpec.openapi || openApiSpec.swagger) {
        endpoints = this.parseOpenApiSpec(openApiSpec);
        isOpenApi = true;
      } else {
        endpoints = await this.extractEndpointsWithAi(documentation);
      }
    } catch {
      // Not JSON, use AI to extract
      endpoints = await this.extractEndpointsWithAi(documentation);
    }

    // 3. Generate integration code
    const proposedFiles = await this.generateIntegrationCode(
      dto.api_name || 'ExternalApi',
      endpoints,
      dto.context,
    );

    // 4. Get AI reasoning
    const reasoning = await this.generateReasoning(endpoints, proposedFiles);

    // 5. Calculate confidence
    const confidence = this.calculateConfidence(endpoints, isOpenApi);

    // 6. Create proposal
    const proposal = this.proposalRepository.create({
      title: `Integration: ${dto.api_name || 'External API'}`,
      description: `Auto-generated integration for ${dto.documentation_url}`,
      type: IntegrationProposalType.API_INTEGRATION,
      status: IntegrationProposalStatus.PENDING,
      source_url: dto.documentation_url,
      source_documentation: documentation.substring(0, 50000), // Limit size
      discovered_endpoints: endpoints,
      proposed_files: proposedFiles,
      ai_reasoning: reasoning,
      confidence_score: confidence,
      created_by_id: userId,
      metadata: {
        api_name: dto.api_name,
        is_openapi: isOpenApi,
        context: dto.context,
      },
    });

    return this.proposalRepository.save(proposal);
  }

  /**
   * Fetch documentation from URL
   */
  private async fetchDocumentation(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/html, text/plain',
          'User-Agent': 'VendHub-AI-Assistant/1.0',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch documentation: HTTP ${response.status}`);
      }

      return response.text();
    } catch (error) {
      this.logger.error(`Failed to fetch documentation: ${error}`);
      throw new BadRequestException(`Could not fetch documentation from ${url}`);
    }
  }

  /**
   * Parse OpenAPI/Swagger specification
   */
  private parseOpenApiSpec(spec: Record<string, unknown>): ApiEndpointInfo[] {
    const endpoints: ApiEndpointInfo[] = [];
    const paths = spec.paths as Record<string, Record<string, unknown>> || {};

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const operation = details as Record<string, unknown>;
          endpoints.push({
            method: method.toUpperCase(),
            path,
            description: (operation.summary || operation.description || '') as string,
            parameters: this.extractParameters(operation.parameters as unknown[]),
            requestBody: this.extractRequestBody(operation.requestBody as Record<string, unknown>),
            response: this.extractResponse(operation.responses as Record<string, unknown>),
          });
        }
      }
    }

    return endpoints;
  }

  private extractParameters(params: unknown[]): ApiEndpointInfo['parameters'] {
    if (!params) return [];
    return params.map((p: Record<string, unknown>) => ({
      name: p.name as string,
      type: (p.schema as Record<string, string>)?.type || 'string',
      required: (p.required as boolean) || false,
      description: p.description as string,
    }));
  }

  private extractRequestBody(body: Record<string, unknown>): ApiEndpointInfo['requestBody'] {
    if (!body) return undefined;
    const content = body.content as Record<string, Record<string, unknown>>;
    const jsonContent = content?.['application/json'];
    if (!jsonContent) return undefined;
    const schema = jsonContent.schema as Record<string, unknown>;
    return {
      type: (schema?.type as string) || 'object',
      properties: (schema?.properties as Record<string, unknown>) || {},
    };
  }

  private extractResponse(responses: Record<string, unknown>): ApiEndpointInfo['response'] {
    if (!responses) return undefined;
    const successResponse = responses['200'] || responses['201'];
    if (!successResponse) return undefined;
    const content = (successResponse as Record<string, unknown>).content as Record<string, Record<string, unknown>>;
    const jsonContent = content?.['application/json'];
    if (!jsonContent) return undefined;
    const schema = jsonContent.schema as Record<string, unknown>;
    return {
      type: (schema?.type as string) || 'object',
      properties: (schema?.properties as Record<string, unknown>) || {},
    };
  }

  /**
   * Extract endpoints using AI when OpenAPI is not available
   */
  private async extractEndpointsWithAi(documentation: string): Promise<ApiEndpointInfo[]> {
    const prompt = `Analyze this API documentation and extract all API endpoints.
Return a JSON array of endpoints with this structure:
[{
  "method": "GET|POST|PUT|PATCH|DELETE",
  "path": "/api/path",
  "description": "What this endpoint does",
  "parameters": [{"name": "param", "type": "string", "required": true}],
  "requestBody": {"type": "object", "properties": {}},
  "response": {"type": "object", "properties": {}}
}]

Documentation:
${documentation.substring(0, 15000)}

Return ONLY valid JSON array, no additional text.`;

    const response = await this.callAi([
      { role: 'system', content: 'You are an API documentation analyzer. Extract endpoint information and return valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      this.logger.warn('Failed to parse AI response as JSON');
      return [];
    }
  }

  // ============================================================================
  // Code Generation
  // ============================================================================

  /**
   * Generate integration code for discovered endpoints
   */
  private async generateIntegrationCode(
    apiName: string,
    endpoints: ApiEndpointInfo[],
    context?: string,
  ): Promise<ProposedFile[]> {
    const serviceName = this.toPascalCase(apiName);
    const moduleDir = this.toKebabCase(apiName);

    const prompt = `Generate NestJS integration code for this external API.

API Name: ${apiName}
Endpoints:
${JSON.stringify(endpoints, null, 2)}

Additional context: ${context || 'None'}

Generate these files:
1. Service class with methods for each endpoint
2. DTOs for request/response
3. Module file
4. Interface types

Use these conventions:
- PascalCase for classes
- camelCase for methods/properties
- Use axios for HTTP calls
- Add proper JSDoc comments
- Use class-validator decorators
- Follow NestJS best practices

Return as JSON with this structure:
{
  "files": [
    {"path": "src/modules/${moduleDir}/service.ts", "content": "...", "description": "..."},
    {"path": "src/modules/${moduleDir}/dto.ts", "content": "...", "description": "..."}
  ]
}`;

    const response = await this.callAi([
      { role: 'system', content: 'You are a senior NestJS developer. Generate production-ready code with proper typing and error handling.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*"files"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.files.map((f: { path: string; content: string; description: string }) => ({
          path: f.path,
          content: f.content,
          action: 'create' as const,
          description: f.description,
        }));
      }
    } catch (e) {
      this.logger.warn('Failed to parse generated code:', e);
    }

    // Fallback: generate basic structure
    return this.generateBasicIntegration(apiName, endpoints);
  }

  /**
   * Generate basic integration structure (fallback)
   */
  private generateBasicIntegration(apiName: string, endpoints: ApiEndpointInfo[]): ProposedFile[] {
    const serviceName = this.toPascalCase(apiName);
    const moduleDir = this.toKebabCase(apiName);

    const serviceContent = `import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ${serviceName}Service {
  private readonly logger = new Logger(${serviceName}Service.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('${apiName.toUpperCase()}_BASE_URL', '');
    this.apiKey = this.configService.get('${apiName.toUpperCase()}_API_KEY', '');
  }

${endpoints.map((e) => `
  /**
   * ${e.description}
   */
  async ${this.toMethodName(e.method, e.path)}(): Promise<unknown> {
    const response = await fetch(\`\${this.baseUrl}${e.path}\`, {
      method: '${e.method}',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new HttpException('API call failed', response.status);
    }

    return response.json();
  }
`).join('\n')}
}
`;

    const moduleContent = `import { Module } from '@nestjs/common';
import { ${serviceName}Service } from './${moduleDir}.service';

@Module({
  providers: [${serviceName}Service],
  exports: [${serviceName}Service],
})
export class ${serviceName}Module {}
`;

    return [
      {
        path: `src/modules/integrations/${moduleDir}/${moduleDir}.service.ts`,
        content: serviceContent,
        action: 'create',
        description: `${serviceName} integration service with ${endpoints.length} methods`,
      },
      {
        path: `src/modules/integrations/${moduleDir}/${moduleDir}.module.ts`,
        content: moduleContent,
        action: 'create',
        description: `${serviceName} NestJS module`,
      },
    ];
  }

  // ============================================================================
  // Documentation Generation
  // ============================================================================

  /**
   * Generate documentation for existing code
   */
  async generateDocumentation(
    dto: GenerateDocumentationDto,
    userId: string,
  ): Promise<IntegrationProposal> {
    const targetPath = path.join(this.projectRoot, dto.target_path);

    // Read files from target path
    const files = await this.readProjectFiles(targetPath);

    if (files.length === 0) {
      throw new BadRequestException(`No TypeScript files found in ${dto.target_path}`);
    }

    // Generate documentation
    const documentation = await this.generateDocsWithAi(files, dto.format || 'markdown');

    const proposal = this.proposalRepository.create({
      title: `Documentation: ${dto.target_path}`,
      description: `Auto-generated ${dto.format || 'markdown'} documentation`,
      type: IntegrationProposalType.DOCUMENTATION,
      status: IntegrationProposalStatus.PENDING,
      generated_documentation: documentation,
      proposed_files: [{
        path: `docs/${this.toKebabCase(path.basename(dto.target_path))}.md`,
        content: documentation,
        action: 'create',
        description: 'Generated documentation',
      }],
      confidence_score: 0.9,
      created_by_id: userId,
      metadata: {
        source_path: dto.target_path,
        format: dto.format,
        files_count: files.length,
      },
    });

    return this.proposalRepository.save(proposal);
  }

  /**
   * Read TypeScript files from directory
   */
  private async readProjectFiles(dirPath: string): Promise<Array<{ name: string; content: string }>> {
    const files: Array<{ name: string; content: string }> = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
          const subFiles = await this.readProjectFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ name: fullPath.replace(this.projectRoot, ''), content });
        }
      }
    } catch (e) {
      this.logger.warn(`Could not read directory ${dirPath}:`, e);
    }

    return files.slice(0, 20); // Limit to 20 files
  }

  /**
   * Generate documentation using AI
   */
  private async generateDocsWithAi(
    files: Array<{ name: string; content: string }>,
    format: string,
  ): Promise<string> {
    const filesContext = files.map((f) =>
      `### ${f.name}\n\`\`\`typescript\n${f.content.substring(0, 3000)}\n\`\`\``
    ).join('\n\n');

    const prompt = `Generate comprehensive ${format} documentation for this code.

Files:
${filesContext}

Generate documentation that includes:
1. Overview and purpose
2. Installation/setup (if applicable)
3. API reference with all public methods
4. Usage examples
5. Configuration options
6. Error handling

Format: ${format}
Make it professional and detailed.`;

    return this.callAi([
      { role: 'system', content: 'You are a technical writer creating clear, comprehensive documentation.' },
      { role: 'user', content: prompt },
    ]);
  }

  // ============================================================================
  // Module Generation
  // ============================================================================

  /**
   * Generate new NestJS module
   */
  async generateModule(dto: GenerateModuleDto, userId: string): Promise<IntegrationProposal> {
    const prompt = `Generate a complete NestJS module for: ${dto.module_name}

Description: ${dto.description}

${dto.entity_fields ? `Entity fields:
${JSON.stringify(dto.entity_fields, null, 2)}` : ''}

Include CRUD: ${dto.include_crud ?? true}
Related modules: ${dto.related_modules?.join(', ') || 'None'}

Generate complete production-ready files:
1. Entity with TypeORM decorators
2. DTOs with class-validator
3. Service with all CRUD methods
4. Controller with Swagger decorators
5. Module file
6. Spec files for testing

Return as JSON:
{
  "files": [
    {"path": "...", "content": "...", "description": "..."}
  ],
  "summary": "Brief summary of generated module"
}`;

    const response = await this.callAi([
      { role: 'system', content: 'You are a senior NestJS architect. Generate production-ready, well-structured code.' },
      { role: 'user', content: prompt },
    ]);

    let proposedFiles: ProposedFile[] = [];
    let summary = '';

    try {
      const jsonMatch = response.match(/\{[\s\S]*"files"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        proposedFiles = parsed.files.map((f: Record<string, string>) => ({
          path: f.path,
          content: f.content,
          action: 'create' as const,
          description: f.description || '',
        }));
        summary = parsed.summary || '';
      }
    } catch {
      // Fallback
      proposedFiles = this.generateBasicModule(dto.module_name, dto.entity_fields);
      summary = 'Basic module structure generated';
    }

    const proposal = this.proposalRepository.create({
      title: `New Module: ${dto.module_name}`,
      description: dto.description,
      type: IntegrationProposalType.MODULE_GENERATION,
      status: IntegrationProposalStatus.PENDING,
      proposed_files: proposedFiles,
      ai_reasoning: summary,
      confidence_score: 0.85,
      created_by_id: userId,
      metadata: {
        module_name: dto.module_name,
        include_crud: dto.include_crud,
        related_modules: dto.related_modules,
      },
    });

    return this.proposalRepository.save(proposal);
  }

  /**
   * Generate basic module structure (fallback)
   */
  private generateBasicModule(
    moduleName: string,
    fields?: GenerateModuleDto['entity_fields'],
  ): ProposedFile[] {
    const name = this.toPascalCase(moduleName);
    const dir = this.toKebabCase(moduleName);

    const entityFields = fields?.map((f) =>
      `  @Column({ type: '${this.typeToColumn(f.type)}'${f.nullable ? ', nullable: true' : ''} })
  ${f.name}: ${f.type};${f.description ? ` // ${f.description}` : ''}`
    ).join('\n\n') || '  // Add your fields here';

    return [
      {
        path: `src/modules/${dir}/entities/${dir}.entity.ts`,
        content: `import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('${dir}')
export class ${name} extends BaseEntity {
${entityFields}
}
`,
        action: 'create',
        description: `${name} entity`,
      },
      {
        path: `src/modules/${dir}/${dir}.service.ts`,
        content: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${name} } from './entities/${dir}.entity';

@Injectable()
export class ${name}Service {
  constructor(
    @InjectRepository(${name})
    private readonly repository: Repository<${name}>,
  ) {}

  async findAll(): Promise<${name}[]> {
    return this.repository.find();
  }

  async findOne(id: string): Promise<${name}> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('${name} not found');
    return entity;
  }

  async create(data: Partial<${name}>): Promise<${name}> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<${name}>): Promise<${name}> {
    await this.findOne(id);
    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.softRemove(entity);
  }
}
`,
        action: 'create',
        description: `${name} service with CRUD operations`,
      },
      {
        path: `src/modules/${dir}/${dir}.module.ts`,
        content: `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${name} } from './entities/${dir}.entity';
import { ${name}Service } from './${dir}.service';

@Module({
  imports: [TypeOrmModule.forFeature([${name}])],
  providers: [${name}Service],
  exports: [${name}Service],
})
export class ${name}Module {}
`,
        action: 'create',
        description: `${name} module`,
      },
    ];
  }

  // ============================================================================
  // Chat Interface
  // ============================================================================

  /**
   * Chat with AI assistant
   */
  async chat(dto: AiChatDto, userId: string): Promise<{
    message: string;
    conversation_id: string;
    code_suggestions?: Array<{ language: string; code: string; description: string }>;
    proposal_id?: string;
  }> {
    const conversationId = dto.conversation_id || crypto.randomUUID();

    // Get or create conversation
    let conversation = this.conversations.get(conversationId);
    if (!conversation) {
      conversation = {
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for VendHub Manager, a vending machine management system.
You help with:
- Code generation and fixes
- API documentation
- Integration development
- Debugging assistance

Project stack: NestJS, TypeORM, Next.js, React Native, PostgreSQL, Redis.
Follow project conventions in CLAUDE.md.
When suggesting code changes, format them as proposals the user can approve.`,
          },
        ],
        created_at: new Date(),
        last_activity: new Date(),
      };
      this.conversations.set(conversationId, conversation);
    }

    // Add context from specified paths
    let contextInfo = '';
    if (dto.context_paths?.length) {
      for (const ctxPath of dto.context_paths.slice(0, 3)) {
        try {
          const content = await fs.readFile(path.join(this.projectRoot, ctxPath), 'utf-8');
          contextInfo += `\n\nFile: ${ctxPath}\n\`\`\`typescript\n${content.substring(0, 2000)}\n\`\`\``;
        } catch {
          // File not found, skip
        }
      }
    }

    const userMessage = contextInfo
      ? `${dto.message}\n\nContext:${contextInfo}`
      : dto.message;

    conversation.messages.push({ role: 'user', content: userMessage });
    conversation.last_activity = new Date();

    // Call AI
    const response = await this.callAi(conversation.messages);

    conversation.messages.push({ role: 'assistant', content: response });

    // Extract code suggestions
    const codeSuggestions = this.extractCodeSuggestions(response);

    // Check if we should create a proposal
    let proposalId: string | undefined;
    if (response.includes('PROPOSAL:') || dto.message.toLowerCase().includes('создай') || dto.message.toLowerCase().includes('generate')) {
      const proposal = await this.createProposalFromChat(response, userId);
      if (proposal) {
        proposalId = proposal.id;
      }
    }

    // Cleanup old conversations (keep last 100)
    if (this.conversations.size > 100) {
      const sorted = [...this.conversations.entries()]
        .sort((a, b) => a[1].last_activity.getTime() - b[1].last_activity.getTime());
      for (let i = 0; i < 20; i++) {
        this.conversations.delete(sorted[i][0]);
      }
    }

    return {
      message: response,
      conversation_id: conversationId,
      code_suggestions: codeSuggestions.length > 0 ? codeSuggestions : undefined,
      proposal_id: proposalId,
    };
  }

  /**
   * Extract code suggestions from AI response
   */
  private extractCodeSuggestions(response: string): Array<{ language: string; code: string; description: string }> {
    const suggestions: Array<{ language: string; code: string; description: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      suggestions.push({
        language: match[1] || 'typescript',
        code: match[2].trim(),
        description: 'Code suggestion from AI',
      });
    }

    return suggestions;
  }

  /**
   * Create proposal from chat if code changes are suggested
   */
  private async createProposalFromChat(response: string, userId: string): Promise<IntegrationProposal | null> {
    const codeBlocks = this.extractCodeSuggestions(response);
    if (codeBlocks.length === 0) return null;

    const proposedFiles: ProposedFile[] = codeBlocks.map((block, index) => ({
      path: `suggested-code-${index + 1}.${block.language === 'typescript' ? 'ts' : block.language}`,
      content: block.code,
      action: 'create' as const,
      description: `AI-suggested ${block.language} code`,
    }));

    const proposal = this.proposalRepository.create({
      title: 'Chat Code Suggestion',
      description: 'Code generated from chat conversation',
      type: IntegrationProposalType.FEATURE,
      status: IntegrationProposalStatus.PENDING,
      proposed_files: proposedFiles,
      ai_reasoning: response.substring(0, 1000),
      confidence_score: 0.7,
      created_by_id: userId,
    });

    return this.proposalRepository.save(proposal);
  }

  // ============================================================================
  // Code Fixes
  // ============================================================================

  /**
   * Analyze and fix code issues
   */
  async fixCode(dto: FixCodeDto, userId: string): Promise<IntegrationProposal> {
    const fullPath = path.join(this.projectRoot, dto.file_path);
    let fileContent: string;

    try {
      fileContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
      throw new BadRequestException(`File not found: ${dto.file_path}`);
    }

    const prompt = `Fix this code issue:

File: ${dto.file_path}
Issue: ${dto.issue_description}
${dto.line_numbers?.length ? `Lines with issues: ${dto.line_numbers.join(', ')}` : ''}

Current code:
\`\`\`typescript
${fileContent}
\`\`\`

Provide the fixed code and explain what you changed.
Return as JSON:
{
  "fixed_code": "...",
  "explanation": "...",
  "changes": ["change 1", "change 2"]
}`;

    const response = await this.callAi([
      { role: 'system', content: 'You are a TypeScript expert. Fix bugs while maintaining code style.' },
      { role: 'user', content: prompt },
    ]);

    let fixedCode = fileContent;
    let explanation = '';
    let changes: string[] = [];

    try {
      const jsonMatch = response.match(/\{[\s\S]*"fixed_code"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        fixedCode = parsed.fixed_code || fileContent;
        explanation = parsed.explanation || '';
        changes = parsed.changes || [];
      }
    } catch {
      // Try to extract code block
      const codeMatch = response.match(/```typescript\n([\s\S]*?)```/);
      if (codeMatch) {
        fixedCode = codeMatch[1];
      }
      explanation = response;
    }

    const proposal = this.proposalRepository.create({
      title: `Fix: ${dto.file_path}`,
      description: dto.issue_description,
      type: IntegrationProposalType.CODE_FIX,
      status: IntegrationProposalStatus.PENDING,
      proposed_files: [{
        path: dto.file_path,
        content: fixedCode,
        action: 'modify',
        description: `Fix: ${changes.join(', ') || dto.issue_description}`,
      }],
      ai_reasoning: explanation,
      confidence_score: 0.8,
      created_by_id: userId,
      metadata: {
        original_issue: dto.issue_description,
        line_numbers: dto.line_numbers,
        changes,
      },
    });

    return this.proposalRepository.save(proposal);
  }

  // ============================================================================
  // Proposal Management
  // ============================================================================

  /**
   * Get all proposals
   */
  async getProposals(query: ListProposalsQueryDto): Promise<IntegrationProposal[]> {
    const where: Record<string, unknown> = { deleted_at: IsNull() };

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.created_by_id) where.created_by_id = query.created_by_id;

    return this.proposalRepository.find({
      where,
      relations: ['created_by', 'approved_by'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get single proposal
   */
  async getProposal(id: string): Promise<IntegrationProposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['created_by', 'approved_by'],
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  /**
   * Review and approve/reject proposal
   */
  async reviewProposal(
    id: string,
    dto: ReviewProposalDto,
    userId: string,
  ): Promise<IntegrationProposal> {
    const proposal = await this.getProposal(id);

    if (proposal.status !== IntegrationProposalStatus.PENDING) {
      throw new BadRequestException('Proposal is not pending');
    }

    if (dto.decision === 'reject') {
      proposal.status = IntegrationProposalStatus.REJECTED;
      proposal.rejection_reason = dto.reason || 'No reason provided';
      return this.proposalRepository.save(proposal);
    }

    // Approve and implement
    proposal.status = IntegrationProposalStatus.APPROVED;
    proposal.approved_by_id = userId;
    proposal.approved_at = new Date();

    // Filter files if partial selection
    const filesToImplement = dto.selected_files?.length
      ? proposal.proposed_files.filter((_, i) => dto.selected_files!.includes(i))
      : proposal.proposed_files;

    try {
      const log = await this.implementFiles(filesToImplement);
      proposal.status = IntegrationProposalStatus.IMPLEMENTED;
      proposal.implemented_at = new Date();
      proposal.implementation_log = log;
    } catch (error) {
      proposal.status = IntegrationProposalStatus.FAILED;
      proposal.implementation_log = `Error: ${error}`;
    }

    return this.proposalRepository.save(proposal);
  }

  /**
   * Implement proposed files
   */
  private async implementFiles(files: ProposedFile[]): Promise<string> {
    const logs: string[] = [];

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file.path);

      try {
        if (file.action === 'delete') {
          await fs.unlink(fullPath);
          logs.push(`Deleted: ${file.path}`);
        } else {
          // Ensure directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, file.content, 'utf-8');
          logs.push(`${file.action === 'create' ? 'Created' : 'Modified'}: ${file.path}`);
        }
      } catch (error) {
        logs.push(`Error with ${file.path}: ${error}`);
      }
    }

    return logs.join('\n');
  }

  /**
   * Delete proposal
   */
  async deleteProposal(id: string): Promise<void> {
    const proposal = await this.getProposal(id);
    await this.proposalRepository.softRemove(proposal);
  }

  // ============================================================================
  // AI Communication
  // ============================================================================

  /**
   * Call AI provider
   */
  private async callAi(messages: AiMessage[]): Promise<string> {
    // Try Anthropic first
    let apiKey = await this.aiProviderKeyService.getActiveKey(AiProvider.ANTHROPIC);
    let endpoint = await this.aiProviderKeyService.getActiveEndpoint(AiProvider.ANTHROPIC);

    if (apiKey) {
      return this.callAnthropic(messages, apiKey, endpoint);
    }

    // Fallback to OpenAI
    apiKey = await this.aiProviderKeyService.getActiveKey(AiProvider.OPENAI);
    endpoint = await this.aiProviderKeyService.getActiveEndpoint(AiProvider.OPENAI);

    if (apiKey) {
      return this.callOpenAi(messages, apiKey, endpoint);
    }

    throw new BadRequestException('No AI provider configured. Add API key in Settings > AI Providers');
  }

  private async callAnthropic(messages: AiMessage[], apiKey: string, endpoint: string | null): Promise<string> {
    const baseUrl = endpoint || 'https://api.anthropic.com/v1';

    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemMessage,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Anthropic API error: ${error}`);
      throw new BadRequestException('AI request failed');
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callOpenAi(messages: AiMessage[], apiKey: string, endpoint: string | null): Promise<string> {
    const baseUrl = endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenAI API error: ${error}`);
      throw new BadRequestException('AI request failed');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateReasoning(endpoints: ApiEndpointInfo[], files: ProposedFile[]): Promise<string> {
    return Promise.resolve(
      `Discovered ${endpoints.length} API endpoints. ` +
      `Generated ${files.length} files for integration. ` +
      `Service includes methods for: ${endpoints.map((e) => `${e.method} ${e.path}`).slice(0, 5).join(', ')}${endpoints.length > 5 ? '...' : ''}`
    );
  }

  private calculateConfidence(endpoints: ApiEndpointInfo[], isOpenApi: boolean): number {
    if (endpoints.length === 0) return 0.3;
    if (isOpenApi) return 0.95;
    return 0.7 + Math.min(endpoints.length * 0.02, 0.2);
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^./, (c) => c.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toMethodName(method: string, path: string): string {
    const parts = path.split('/').filter(Boolean);
    const resource = parts.find((p) => !p.startsWith('{') && !p.startsWith(':')) || 'resource';
    const action = method.toLowerCase() === 'get'
      ? (path.includes('{') || path.includes(':') ? 'getById' : 'getAll')
      : method.toLowerCase();
    return `${action}${this.toPascalCase(resource)}`;
  }

  private typeToColumn(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'varchar',
      number: 'integer',
      boolean: 'boolean',
      Date: 'timestamp',
      object: 'jsonb',
    };
    return typeMap[type] || 'varchar';
  }
}
