import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
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
import { SalesImportService } from './sales-import.service';
import { SalesImport, ImportStatus } from './entities/sales-import.entity';
import { UploadSalesDto } from './dto/upload-sales.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

/** Request with authenticated user */
interface AuthenticatedRequest extends ExpressRequest {
  user: { id: string };
}

/** Job status response from Bull queue */
interface JobStatusResponse {
  jobId: string | number;
  state: string;
  progress: number | object;
  data: Record<string, unknown>;
  failedReason: string | null | undefined;
  attemptsMade: number;
  processedOn: number | null | undefined;
  finishedOn: number | null | undefined;
}

@ApiTags('Sales Import')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-import')
export class SalesImportController {
  constructor(private readonly salesImportService: SalesImportService) {}

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload sales file (Excel/CSV)' })
  @ApiBody({
    description: 'Sales file',
    type: UploadSalesDto,
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded and queued for processing',
    schema: {
      type: 'object',
      properties: {
        importRecord: { type: 'object' },
        jobId: { type: 'string' },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ importRecord: SalesImport; jobId: string }> {
    const userId = req.user.id;
    return this.salesImportService.uploadSalesFile(file, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales imports' })
  @ApiQuery({
    name: 'status',
    enum: ImportStatus,
    required: false,
  })
  @ApiQuery({
    name: 'userId',
    type: String,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of imports',
    type: [SalesImport],
  })
  findAll(
    @Query('status') status?: ImportStatus,
    @Query('userId') userId?: string,
  ): Promise<SalesImport[]> {
    return this.salesImportService.findAll(status, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import by ID' })
  @ApiParam({ name: 'id', description: 'Import UUID' })
  @ApiResponse({
    status: 200,
    description: 'Import details',
    type: SalesImport,
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SalesImport> {
    return this.salesImportService.findOne(id);
  }

  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Retry failed import' })
  @ApiParam({ name: 'id', description: 'Import UUID' })
  @ApiResponse({
    status: 200,
    description: 'Import requeued',
    type: SalesImport,
  })
  retry(@Param('id', ParseUUIDPipe) id: string): Promise<SalesImport> {
    return this.salesImportService.retryImport(id);
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get job status from queue' })
  @ApiParam({ name: 'jobId', description: 'Bull job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job status',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        state: { type: 'string', enum: ['waiting', 'active', 'completed', 'failed', 'delayed'] },
        progress: { type: 'number' },
        data: { type: 'object' },
        failedReason: { type: 'string' },
        attemptsMade: { type: 'number' },
        processedOn: { type: 'number' },
        finishedOn: { type: 'number' },
      },
    },
  })
  getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponse> {
    return this.salesImportService.getJobStatus(jobId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete import' })
  @ApiParam({ name: 'id', description: 'Import UUID' })
  @ApiResponse({ status: 204, description: 'Import deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.salesImportService.remove(id);
  }
}
