import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MachineAccessService } from './machine-access.service';
import { MachineAccessImportService } from './machine-access-import.service';
import {
  CreateMachineAccessDto,
  UpdateMachineAccessDto,
  CreateAccessTemplateDto,
  UpdateAccessTemplateDto,
  CreateTemplateRowDto,
  ApplyTemplateDto,
  BulkAssignDto,
} from './dto';

@ApiTags('machine-access')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('machines/access')
export class MachineAccessController {
  constructor(
    private readonly machineAccessService: MachineAccessService,
    private readonly importService: MachineAccessImportService,
  ) {}

  // ==================== ACCESS ENTRIES ====================

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Get all access entries for a machine' })
  async findByMachine(@Param('machineId', ParseUUIDPipe) machineId: string) {
    return this.machineAccessService.findByMachine(machineId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all access entries for a user' })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.machineAccessService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get access entry by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.machineAccessService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create or update access entry' })
  async create(@Body() dto: CreateMachineAccessDto, @Req() req: any) {
    return this.machineAccessService.create(dto, req.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update access entry role' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMachineAccessDto,
  ) {
    return this.machineAccessService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete access entry' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.machineAccessService.remove(id);
    return { success: true };
  }

  // ==================== BULK OPERATIONS ====================

  @Post('assign-me-owner-all')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign current user as owner to all machines' })
  async assignMeOwnerAll(@Req() req: any) {
    return this.machineAccessService.assignOwnerToAllMachines(req.user.id, req.user.id);
  }

  @Post('bulk-assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk assign user to multiple machines' })
  async bulkAssign(@Body() dto: BulkAssignDto, @Req() req: any) {
    return this.machineAccessService.bulkAssign(dto, req.user.id);
  }

  // ==================== IMPORT ====================

  @Post('import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import access entries from CSV/XLSX file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or XLSX file with columns: machine_number, serial_number, user_identifier, role',
        },
      },
    },
  })
  async importFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return this.importService.importFromCsv(file.buffer, req.user.id);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.importService.importFromXlsx(file.buffer, req.user.id);
    } else {
      throw new BadRequestException('Only CSV and XLSX files are supported');
    }
  }

  // ==================== TEMPLATES ====================

  @Get('templates')
  @ApiOperation({ summary: 'Get all access templates' })
  async findAllTemplates() {
    return this.machineAccessService.findAllTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.machineAccessService.findTemplateById(id);
  }

  @Post('templates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new access template' })
  async createTemplate(@Body() dto: CreateAccessTemplateDto, @Req() req: any) {
    return this.machineAccessService.createTemplate(dto, req.user.id);
  }

  @Patch('templates/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update template' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccessTemplateDto,
  ) {
    return this.machineAccessService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete template' })
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.machineAccessService.deleteTemplate(id);
    return { success: true };
  }

  @Post('templates/:id/rows')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add row to template' })
  async addTemplateRow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTemplateRowDto,
  ) {
    return this.machineAccessService.addTemplateRow(id, dto);
  }

  @Delete('templates/:id/rows/:rowId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove row from template' })
  async removeTemplateRow(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
  ) {
    await this.machineAccessService.removeTemplateRow(id, rowId);
    return { success: true };
  }

  @Post('templates/:id/apply')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Apply template to machines' })
  async applyTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyTemplateDto,
    @Req() req: any,
  ) {
    return this.machineAccessService.applyTemplate(id, dto, req.user.id);
  }
}
