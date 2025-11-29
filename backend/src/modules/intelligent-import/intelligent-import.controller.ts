import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IntelligentImportService } from './intelligent-import.service';
import { ImportSession } from './entities/import-session.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { CreateImportDto } from './dto/create-import.dto';
import { ApprovalDto, ApprovalAction } from './dto/approval.dto';
import { DomainType, ImportSessionStatus } from './interfaces/common.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Intelligent Import')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('intelligent-import')
export class IntelligentImportController {
  constructor(private readonly importService: IntelligentImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file and start intelligent import' })
  @ApiBody({ type: CreateImportDto })
  @ApiResponse({
    status: 201,
    description: 'Import started successfully',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: Object.values(ImportSessionStatus) },
        message: { type: 'string' },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: Request & { user: { sub: string } },
  ): Promise<{ sessionId: string; status: ImportSessionStatus; message: string }> {
    const userId = req.user.sub;
    return this.importService.startImport(file, userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all import sessions' })
  @ApiQuery({ name: 'status', enum: ImportSessionStatus, required: false })
  @ApiQuery({ name: 'domain', enum: DomainType, required: false })
  @ApiQuery({ name: 'userId', type: String, required: false })
  @ApiResponse({ status: 200, description: 'List of import sessions', type: [ImportSession] })
  async getSessions(
    @Query('status') status?: ImportSessionStatus,
    @Query('domain') domain?: DomainType,
    @Query('userId') userId?: string,
  ): Promise<ImportSession[]> {
    return this.importService.getSessions(status, domain, userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get import session by ID' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Import session details', type: ImportSession })
  async getSession(@Param('id') id: string): Promise<ImportSession> {
    return this.importService.getSession(id);
  }

  @Post('sessions/:id/approval')
  @ApiOperation({ summary: 'Approve or reject import session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiBody({ type: ApprovalDto })
  @ApiResponse({ status: 200, description: 'Approval processed', type: ImportSession })
  async handleApproval(
    @Param('id') id: string,
    @Body() dto: ApprovalDto,
    @Request() req: Request & { user: { sub: string } },
  ): Promise<ImportSession> {
    const userId = req.user.sub;

    if (dto.action === ApprovalAction.APPROVE) {
      return this.importService.approveSession(id, userId);
    } else {
      return this.importService.rejectSession(id, userId, dto.reason || 'No reason provided');
    }
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all import templates' })
  @ApiQuery({ name: 'domain', enum: DomainType, required: false })
  @ApiResponse({ status: 200, description: 'List of templates', type: [ImportTemplate] })
  async getTemplates(@Query('domain') domain?: DomainType): Promise<ImportTemplate[]> {
    return this.importService.getTemplates(domain);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete import session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 204, description: 'Session deleted' })
  async deleteSession(@Param('id') id: string): Promise<void> {
    return this.importService.deleteSession(id);
  }
}
