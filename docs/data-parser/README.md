# Data Parser Module

## Overview

The Data Parser module provides universal file parsing capabilities for VendHub Manager. It supports multiple file formats including Excel, CSV, JSON, and more, with intelligent format detection and data recovery.

## Key Features

- Universal file parsing (Excel, CSV, JSON, XML, PDF)
- Intelligent format detection
- Multiple encoding support
- Data validation and transformation
- Error recovery for corrupted files
- Alternative parser fallback

## Architecture

### Parser Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIVERSAL PARSER                            │
│                    (Orchestrator/Factory)                        │
├─────────────────────────────────────────────────────────────────┤
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│   ┌───────────┐       ┌───────────┐       ┌───────────┐        │
│   │   Excel   │       │    CSV    │       │   JSON    │        │
│   │  Parser   │       │  Parser   │       │  Parser   │        │
│   └───────────┘       └───────────┘       └───────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Formats

| Format | Extension | Library | Description |
|--------|-----------|---------|-------------|
| Excel | .xlsx, .xls | ExcelJS | Microsoft Excel files |
| CSV | .csv | csv-parser | Comma-separated values |
| JSON | .json | Native | JavaScript Object Notation |
| XML | .xml | fast-xml-parser | Extensible Markup Language |
| PDF | .pdf | pdf-parse | PDF documents |
| Text | .txt | Native | Plain text files |

## Universal Parser

**File**: `backend/src/modules/data-parser/parsers/universal.parser.ts`

```typescript
@Injectable()
export class UniversalParser implements DataParser {
  private readonly parsers = new Map<FileFormat, DataParser>();

  constructor() {
    this.registerParsers();
  }

  private registerParsers(): void {
    this.parsers.set(FileFormat.EXCEL, new ExcelParser());
    this.parsers.set(FileFormat.CSV, new CsvParser());
    this.parsers.set(FileFormat.JSON, new JsonParser());
  }

  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParsedData>;
  detectFormat(input: Buffer): FileFormat;
  validate(data: ParsedData, schema?: unknown): ValidationResult;
  transform(data: ParsedData, rules?: unknown): TransformedData;
}
```

## Interfaces

### ParsedData

```typescript
interface ParsedData {
  data: Record<string, unknown>[];     // Parsed rows
  metadata: {
    format: FileFormat;                 // Detected format
    encoding: string;                   // File encoding
    parsedAt: Date;                     // Parse timestamp
    headers: string[];                  // Column headers
    rowCount: number;                   // Total rows
    columnCount: number;                // Total columns
  };
  warnings: ParseWarning[];             // Non-fatal issues
  errors: ParseError[];                 // Errors encountered
  statistics: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    skippedRows: number;
    processingTimeMs: number;
  };
}
```

### ParserOptions

```typescript
interface ParserOptions {
  autoDetect?: boolean;          // Auto-detect format (default: true)
  delimiter?: string;            // CSV delimiter
  encoding?: string;             // File encoding
  skipRows?: number;             // Skip first N rows
  maxRows?: number;              // Maximum rows to parse
  recoverCorrupted?: boolean;    // Try to recover corrupted data
  validateData?: boolean;        // Run validation after parsing
}
```

### ParseWarning / ParseError

```typescript
interface ParseWarning {
  type: 'format' | 'encoding' | 'data';
  message: string;
  row?: number;
  column?: string;
}

interface ParseError {
  row: number;
  type: 'fatal' | 'recoverable';
  message: string;
  column?: string;
}
```

## Format Detection

### Magic Bytes Detection

```typescript
detectFormat(input: Buffer): FileFormat {
  const header = input.slice(0, 16);

  // Excel XLSX (ZIP format)
  if (header[0] === 0x50 && header[1] === 0x4b &&
      header[2] === 0x03 && header[3] === 0x04) {
    return FileFormat.EXCEL;
  }

  // Excel XLS (OLE format)
  if (header[0] === 0xd0 && header[1] === 0xcf &&
      header[2] === 0x11 && header[3] === 0xe0) {
    return FileFormat.EXCEL;
  }

  // PDF
  if (header.toString('utf8', 0, 4) === '%PDF') {
    return FileFormat.PDF;
  }

  // Try text-based detection...
}
```

### Content-Based Detection

For text files, the parser analyzes content:

```typescript
// JSON detection
if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
  try {
    JSON.parse(text);
    return FileFormat.JSON;
  } catch {}
}

// XML detection
if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
  return FileFormat.XML;
}

// CSV detection - consistent column count
const lines = text.split('\n');
const delimiter = detectDelimiter(lines);
if (delimiter && hasConsistentColumns(lines, delimiter)) {
  return FileFormat.CSV;
}
```

### Delimiter Detection

```typescript
detectDelimiter(lines: string[]): string | null {
  const delimiters = [',', ';', '\t', '|'];

  for (const delimiter of delimiters) {
    const counts = lines.map(line => line.split(delimiter).length);
    // All lines have same column count > 1
    if (counts.every(c => c === counts[0] && c > 1)) {
      return delimiter;
    }
  }
  return null;
}
```

## Error Recovery

### Corrupted Data Recovery

```typescript
async tryRecoverCorruptedData(input: Buffer): Promise<ParsedData | null> {
  // Try different encodings
  const encodings = ['utf8', 'utf16le', 'latin1', 'windows-1251'];

  for (const encoding of encodings) {
    const text = input.toString(encoding as BufferEncoding);

    // Try different delimiters
    for (const delimiter of [',', ';', '\t', '|']) {
      const result = tryParseCSV(text, delimiter);
      if (result && result.data.length > 0) {
        return {
          ...result,
          warnings: [{
            type: 'format',
            message: `Recovered using ${encoding} encoding and ${delimiter} delimiter`
          }]
        };
      }
    }
  }
  return null;
}
```

### Alternative Parser Fallback

```typescript
async tryAlternativeParsers(
  buffer: Buffer,
  failedFormat: FileFormat,
  options: ParserOptions
): Promise<ParsedData> {
  for (const [format, parser] of this.parsers.entries()) {
    if (format !== failedFormat) {
      try {
        const result = await parser.parse(buffer, options);
        result.warnings.push({
          type: 'format',
          message: `File parsed as ${format} instead of ${failedFormat}`
        });
        return result;
      } catch {}
    }
  }
  throw new BadRequestException('Failed to parse file with any available parser');
}
```

## Excel Parser

**File**: `backend/src/modules/data-parser/parsers/excel.parser.ts`

```typescript
@Injectable()
export class ExcelParser implements DataParser {
  async parse(input: Buffer, options?: ParserOptions): Promise<ParsedData> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(input);

    const worksheet = workbook.worksheets[0];
    const headers: string[] = [];
    const data: Record<string, unknown>[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Extract headers
        row.eachCell(cell => headers.push(cell.value?.toString() || ''));
      } else {
        // Extract data
        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber - 1]] = cell.value;
        });
        data.push(rowData);
      }
    });

    return { data, metadata: { ... }, ... };
  }
}
```

## CSV Parser

**File**: `backend/src/modules/data-parser/parsers/csv.parser.ts`

```typescript
@Injectable()
export class CsvParser implements DataParser {
  async parse(input: Buffer, options?: ParserOptions): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const results: Record<string, unknown>[] = [];
      const stream = Readable.from(input);

      stream
        .pipe(csv({
          separator: options?.delimiter || ',',
          headers: true,
        }))
        .on('data', row => results.push(row))
        .on('end', () => resolve({ data: results, ... }))
        .on('error', reject);
    });
  }
}
```

## Data Validation

**File**: `backend/src/modules/data-parser/services/data-validation.service.ts`

```typescript
@Injectable()
export class DataValidationService {
  validate(data: ParsedData, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (let i = 0; i < data.data.length; i++) {
      const row = data.data[i];

      for (const rule of rules) {
        const result = this.applyRule(row, rule, i + 1);
        if (result.error) errors.push(result.error);
        if (result.warning) warnings.push(result.warning);
      }
    }

    return {
      isValid: errors.length === 0,
      data: data.data,
      errors,
      warnings,
      summary: {
        total: data.data.length,
        valid: data.data.length - errors.length,
        invalid: errors.length,
        warnings: warnings.length,
      }
    };
  }
}
```

### Validation Rules

```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  options?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    validator?: (value: unknown) => boolean;
  };
  severity: 'error' | 'warning';
  message: string;
}

// Example rules
const rules: ValidationRule[] = [
  {
    field: 'machine_number',
    type: 'required',
    severity: 'error',
    message: 'Machine number is required'
  },
  {
    field: 'amount',
    type: 'range',
    options: { min: 0, max: 100000000 },
    severity: 'error',
    message: 'Amount must be between 0 and 100,000,000'
  },
  {
    field: 'date',
    type: 'format',
    options: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
    severity: 'error',
    message: 'Date must be in YYYY-MM-DD format'
  }
];
```

## API Endpoints

```
POST   /api/data-parser/parse          Parse file
POST   /api/data-parser/detect-format  Detect file format
POST   /api/data-parser/validate       Validate parsed data
GET    /api/data-parser/formats        List supported formats
```

## Usage Examples

### Basic Parsing

```typescript
const buffer = fs.readFileSync('data.xlsx');
const result = await this.dataParserService.parse(buffer);

console.log('Rows parsed:', result.data.length);
console.log('Headers:', result.metadata.headers);
```

### With Options

```typescript
const result = await this.dataParserService.parse(buffer, {
  delimiter: ';',              // CSV delimiter
  skipRows: 2,                 // Skip header rows
  maxRows: 1000,              // Limit rows
  recoverCorrupted: true,     // Try recovery
});
```

### With Validation

```typescript
const parsed = await this.dataParserService.parse(buffer);
const validated = await this.validationService.validate(parsed, rules);

if (!validated.isValid) {
  console.error('Validation errors:', validated.errors);
}
```

## Integration with Other Modules

### Sales Import

- Uses data parser for Excel/CSV sales files
- Applies domain-specific validation rules

### Intelligent Import

- Universal parser for format detection
- Validation service for data quality checks

### Opening Balances

- Parses Excel files for initial stock import

## Best Practices

1. **Specify Format When Known**: Auto-detection has overhead
2. **Use Recovery Carefully**: May produce incomplete data
3. **Validate After Parsing**: Always validate before processing
4. **Handle Large Files**: Use streaming for large files
5. **Log Warnings**: Don't ignore parser warnings

## Error Handling

```typescript
try {
  const result = await this.parser.parse(buffer, options);

  if (result.errors.length > 0) {
    this.logger.warn(`Parsed with ${result.errors.length} errors`);
  }

  for (const warning of result.warnings) {
    this.logger.warn(`Parse warning: ${warning.message}`);
  }

  return result;
} catch (error) {
  this.logger.error(`Parse failed: ${error.message}`);
  throw new BadRequestException('Failed to parse file');
}
```

## Related Modules

- [Sales Import](../sales-import/README.md) - Sales file import
- [Intelligent Import](../intelligent-import/README.md) - AI-powered import
- [Opening Balances](../opening-balances/README.md) - Stock import
- [Files](../files/README.md) - File storage
