import { Module } from '@nestjs/common';
import { DataParserService } from './data-parser.service';
import { DataParserController } from './data-parser.controller';
import { UniversalParser } from './parsers/universal.parser';
import { ExcelParser } from './parsers/excel.parser';
import { CsvParser } from './parsers/csv.parser';
import { JsonParser } from './parsers/json.parser';
import { DataValidationService } from './services/data-validation.service';
import { CommonModule } from '@/common/common.module';

/**
 * Data Parser Module
 *
 * Provides comprehensive data parsing, validation, and transformation capabilities
 * for multiple file formats with Uzbekistan-specific support
 */
@Module({
  imports: [CommonModule],
  controllers: [DataParserController],
  providers: [
    DataParserService,
    UniversalParser,
    ExcelParser,
    CsvParser,
    JsonParser,
    DataValidationService,
  ],
  exports: [DataParserService, UniversalParser, DataValidationService],
})
export class DataParserModule {}
