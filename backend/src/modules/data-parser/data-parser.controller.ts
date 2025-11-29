import {
  Controller,
  Post,
  Get,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { DataParserService } from './data-parser.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FileFormat } from './interfaces/parser.interface';

/**
 * Data Parser Controller
 *
 * API endpoints for data parsing and validation
 */
@ApiTags('data-parser')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data-parser')
export class DataParserController {
  constructor(private readonly dataParserService: DataParserService) {}

  /**
   * Parse and validate file
   */
  @Post('parse')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Parse and validate data file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to parse (Excel, CSV, JSON)',
        },
        format: {
          type: 'string',
          enum: ['excel', 'csv', 'json'],
          description: 'File format (auto-detected if not provided)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async parseFile(@UploadedFile() file: Express.Multer.File, @Body('format') format?: FileFormat) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.dataParserService.parse(file.buffer, format);

    return {
      success: true,
      format: result.metadata.format,
      rowCount: result.data.length,
      columnCount: result.metadata.columnCount,
      headers: result.metadata.headers,
      warnings: result.warnings,
      errors: result.errors,
      statistics: result.statistics,
      data: result.data.slice(0, 10), // Return first 10 rows as preview
    };
  }

  /**
   * Parse sales import file
   */
  @Post('parse/sales')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Parse sales import file with validation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Sales data file',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async parseSalesFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.dataParserService.parseSalesImport(file.buffer);

    return {
      success: true,
      validRows: result.success.length,
      invalidRows: result.failed.length,
      warnings: result.warnings.length,
      data: {
        valid: result.success.slice(0, 10),
        invalid: result.failed.slice(0, 10),
        warnings: result.warnings.slice(0, 10),
      },
      summary: {
        total: result.success.length + result.failed.length,
        valid: result.success.length,
        invalid: result.failed.length,
        successRate: (result.success.length / (result.success.length + result.failed.length)) * 100,
      },
    };
  }

  /**
   * Parse counterparties import file
   */
  @Post('parse/counterparties')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Parse counterparties import file with validation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Counterparties data file',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async parseCounterpartiesFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.dataParserService.parseCounterpartiesImport(file.buffer);

    return {
      success: true,
      validRows: result.success.length,
      invalidRows: result.failed.length,
      warnings: result.warnings.length,
      data: {
        valid: result.success.slice(0, 10),
        invalid: result.failed.slice(0, 10),
        warnings: result.warnings.slice(0, 10),
      },
      summary: {
        total: result.success.length + result.failed.length,
        valid: result.success.length,
        invalid: result.failed.length,
        successRate: (result.success.length / (result.success.length + result.failed.length)) * 100,
      },
    };
  }

  /**
   * Parse inventory import file
   */
  @Post('parse/inventory')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Parse inventory import file with validation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Inventory data file',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async parseInventoryFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.dataParserService.parseInventoryImport(file.buffer);

    return {
      success: true,
      validRows: result.success.length,
      invalidRows: result.failed.length,
      warnings: result.warnings.length,
      data: {
        valid: result.success.slice(0, 10),
        invalid: result.failed.slice(0, 10),
        warnings: result.warnings.slice(0, 10),
      },
      summary: {
        total: result.success.length + result.failed.length,
        valid: result.success.length,
        invalid: result.failed.length,
        successRate: (result.success.length / (result.success.length + result.failed.length)) * 100,
      },
    };
  }

  /**
   * Detect file format
   */
  @Post('detect-format')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Detect file format' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to analyze',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async detectFormat(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const format = this.dataParserService.detectFormat(file.buffer);

    return {
      success: true,
      filename: file.originalname,
      size: file.size,
      detectedFormat: format,
      mimeType: file.mimetype,
    };
  }

  /**
   * Try to recover corrupted file
   */
  @Post('recover')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Try to recover corrupted data file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Corrupted file to recover',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async recoverFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const recovered = await this.dataParserService.tryRecover(file.buffer);

    if (!recovered) {
      return {
        success: false,
        message: 'Unable to recover data from file',
      };
    }

    return {
      success: true,
      format: recovered.metadata.format,
      encoding: recovered.metadata.encoding,
      rowCount: recovered.data.length,
      columnCount: recovered.metadata.columnCount,
      warnings: recovered.warnings,
      data: recovered.data.slice(0, 10), // Preview
    };
  }

  /**
   * Get supported formats
   */
  @Get('formats')
  @ApiOperation({ summary: 'Get list of supported file formats' })
  @ApiResponse({
    status: 200,
    description: 'List of supported formats',
    schema: {
      type: 'object',
      properties: {
        formats: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['excel', 'csv', 'json', 'xml', 'pdf', 'txt'],
          },
        },
        details: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              extensions: {
                type: 'array',
                items: { type: 'string' },
              },
              mimeTypes: {
                type: 'array',
                items: { type: 'string' },
              },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  getSupportedFormats() {
    const formats = this.dataParserService.getSupportedFormats();

    return {
      formats,
      details: {
        excel: {
          extensions: ['.xlsx', '.xls'],
          mimeTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
          ],
          description: 'Microsoft Excel files',
        },
        csv: {
          extensions: ['.csv'],
          mimeTypes: ['text/csv', 'application/csv'],
          description: 'Comma-separated values files',
        },
        json: {
          extensions: ['.json'],
          mimeTypes: ['application/json'],
          description: 'JavaScript Object Notation files',
        },
      },
    };
  }
}
