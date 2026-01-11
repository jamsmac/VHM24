# Prince XML Integration Guide

## Overview

Prince XML is integrated into VendHub Manager for high-quality HTML/CSS to PDF conversion. Prince provides superior rendering compared to PDFKit, especially for complex layouts, CSS styling, and typography.

## Installation

Prince XML 16.1 is installed at: `~/.local/prince/bin/prince`

To install Prince system-wide (requires sudo):
```bash
cd /path/to/prince-16.1-macos
sudo ./install.sh /usr/local
```

To verify installation:
```bash
~/.local/prince/bin/prince --version
# or if installed system-wide:
prince --version
```

## Configuration

### Environment Variables

Add to your `.env` file:
```env
# Prince XML path (optional, auto-detected)
PRINCE_PATH=/usr/local/bin/prince
# or for user installation:
PRINCE_PATH=/Users/username/.local/prince/bin/prince
```

The service will auto-detect Prince in these locations:
1. `PRINCE_PATH` environment variable
2. `~/.local/prince/bin/prince` (user installation)
3. `/usr/local/bin/prince` (system installation)

## Usage

### Basic Usage

```typescript
import { PrincePdfService } from '@modules/reports/prince-pdf.service';

// Inject service
constructor(private readonly princePdfService: PrincePdfService) {}

// Generate PDF from HTML string
async generateReport(res: Response) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial; }
          h1 { color: #2196F3; }
        </style>
      </head>
      <body>
        <h1>My Report</h1>
        <p>Report content here...</p>
      </body>
    </html>
  `;

  await this.princePdfService.generateFromHtml(
    html,
    res,
    'report.pdf',
    {
      pageSize: 'A4',
      media: 'print',
      title: 'My Report',
    }
  );
}
```

### Using HTML Templates

```typescript
import { generateDashboardReportHtml } from './templates/report-template';

const data = {
  period: { from: '2025-01-01', to: '2025-01-31' },
  financial: { revenue: 1000000, expenses: 500000, collections: 800000, net_profit: 500000 },
  // ... other data
};

const html = generateDashboardReportHtml(data);
await this.princePdfService.generateFromHtml(html, res, 'dashboard.pdf');
```

### Prince Options

```typescript
interface PrinceOptions {
  baseUrl?: string;        // Base URL for resolving relative URLs
  css?: string;            // CSS file path or CSS string
  media?: string;          // Media type (screen, print, etc.)
  pageSize?: string;       // Page size (A4, Letter, etc.)
  pageMargin?: string;     // Page margins (e.g., "1in")
  encoding?: string;       // Input encoding
  log?: string;           // Log file path
  verbose?: boolean;       // Verbose output
  noEmbedFonts?: boolean; // Don't embed fonts
  noCompress?: boolean;    // Don't compress PDF
  title?: string;         // PDF title metadata
  subject?: string;       // PDF subject metadata
  author?: string;        // PDF author metadata
  keywords?: string;      // PDF keywords metadata
}
```

## API Endpoints

### HTML-based PDF (Prince)

```
GET /api/reports/dashboard/pdf-html?date_from=2025-01-01&date_to=2025-01-31
```

### Traditional PDF (PDFKit)

```
GET /api/reports/dashboard/pdf?date_from=2025-01-01&date_to=2025-01-31
```

## Comparison: Prince vs PDFKit

| Feature | Prince XML | PDFKit |
|---------|-----------|--------|
| HTML/CSS Support | ✅ Full CSS3 support | ❌ Limited |
| Typography | ✅ Excellent | ⚠️ Basic |
| Complex Layouts | ✅ CSS Grid, Flexbox | ❌ Manual positioning |
| Page Breaks | ✅ CSS page-break | ⚠️ Manual |
| Tables | ✅ Full CSS table support | ⚠️ Manual drawing |
| Performance | ⚠️ Slower (external process) | ✅ Fast (in-process) |
| Cost | ⚠️ Commercial license | ✅ Free |
| Use Case | Complex styled reports | Programmatic PDFs |

## When to Use Each

### Use Prince XML when:
- You need complex CSS styling
- You have HTML templates with advanced layouts
- You want professional typography
- You need CSS Grid/Flexbox layouts
- You're converting existing HTML pages

### Use PDFKit when:
- You're generating PDFs programmatically
- You need fast generation
- You have simple layouts
- You're building PDFs from data structures

## Troubleshooting

### Prince not found

```bash
# Check if Prince is installed
which prince
# or
~/.local/prince/bin/prince --version

# Set PRINCE_PATH in .env
PRINCE_PATH=/path/to/prince/bin/prince
```

### Permission errors

```bash
# Make sure Prince binary is executable
chmod +x ~/.local/prince/bin/prince
```

### HTML rendering issues

- Use `@page` CSS rules for page setup
- Use `page-break-inside: avoid` to prevent breaks
- Test HTML in browser first
- Check Prince logs if `log` option is set

## Examples

See:
- `backend/src/modules/reports/templates/report-template.ts` - HTML template examples
- `backend/src/modules/reports/reports.controller.ts` - API endpoint examples

## License

Prince XML requires a license for commercial use. Non-commercial use is free.
See: https://www.princexml.com/license/

