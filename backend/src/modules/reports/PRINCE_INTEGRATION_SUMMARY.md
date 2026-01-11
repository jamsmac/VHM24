# Prince XML Integration - Summary

## ✅ Completed

### 1. Prince XML Installation
- ✅ Installed Prince XML 16.1 to `~/.local/prince/bin/prince`
- ✅ Verified installation: `Prince 16.1` (Non-commercial License)

### 2. Service Implementation
- ✅ Created `PrincePdfService` (`prince-pdf.service.ts`)
  - HTML string to PDF conversion
  - HTML file to PDF conversion
  - Comprehensive Prince options support
  - Automatic path detection
  - Error handling and cleanup

### 3. Module Integration
- ✅ Added `PrincePdfService` to `ReportsModule`
- ✅ Exported service for use in other modules

### 4. HTML Templates
- ✅ Created `report-template.ts` with dashboard report template
  - Professional HTML/CSS layout
  - Responsive design for PDF
  - Russian language support
  - Currency formatting

### 5. API Endpoint
- ✅ Added `/api/reports/dashboard/pdf-html` endpoint
  - Uses Prince for HTML-to-PDF conversion
  - Same data structure as PDFKit endpoint
  - Better styling and layout support

### 6. Documentation
- ✅ Created `PRINCE_SETUP.md` with:
  - Installation instructions
  - Usage examples
  - Configuration options
  - Troubleshooting guide
  - Comparison with PDFKit

## 📁 Files Created/Modified

### New Files
1. `backend/src/modules/reports/prince-pdf.service.ts` - Prince XML service
2. `backend/src/modules/reports/templates/report-template.ts` - HTML templates
3. `backend/src/modules/reports/PRINCE_SETUP.md` - Documentation
4. `backend/src/modules/reports/PRINCE_INTEGRATION_SUMMARY.md` - This file

### Modified Files
1. `backend/src/modules/reports/reports.module.ts` - Added PrincePdfService
2. `backend/src/modules/reports/reports.controller.ts` - Added HTML PDF endpoint

## 🚀 Usage

### Basic Usage
```typescript
// In a controller
@Get('report/pdf')
async generateReport(@Res() res: Response) {
  const html = generateDashboardReportHtml(data);
  await this.princePdfService.generateFromHtml(
    html,
    res,
    'report.pdf',
    { pageSize: 'A4', media: 'print' }
  );
}
```

### API Endpoint
```bash
# HTML-based PDF (Prince)
GET /api/reports/dashboard/pdf-html?date_from=2025-01-01&date_to=2025-01-31

# Traditional PDF (PDFKit)
GET /api/reports/dashboard/pdf?date_from=2025-01-01&date_to=2025-01-31
```

## ⚙️ Configuration

### Environment Variable (Optional)
```env
PRINCE_PATH=/path/to/prince/bin/prince
```

Auto-detection order:
1. `PRINCE_PATH` environment variable
2. `~/.local/prince/bin/prince` (user installation)
3. `/usr/local/bin/prince` (system installation)

## 🔍 Testing

### Verify Installation
```bash
~/.local/prince/bin/prince --version
# Should output: Prince 16.1
```

### Test Service
```typescript
// Check if Prince is available
const isAvailable = await princePdfService.checkPrinceAvailable();
console.log('Prince available:', isAvailable);
```

## 📊 Comparison

| Feature | Prince XML | PDFKit |
|---------|-----------|--------|
| HTML/CSS | ✅ Full support | ❌ Limited |
| Typography | ✅ Excellent | ⚠️ Basic |
| Layout | ✅ CSS Grid/Flexbox | ❌ Manual |
| Use Case | HTML templates | Programmatic |

## 🎯 Next Steps (Optional)

1. **Add more HTML templates** for other report types
2. **Create template engine** (Handlebars, EJS) for dynamic HTML
3. **Add caching** for generated HTML templates
4. **Performance optimization** for large reports
5. **Add Prince-specific CSS** for better page breaks

## ⚠️ Notes

- Prince XML requires a license for commercial use
- Current installation uses non-commercial license
- Prince is slower than PDFKit (external process)
- Use Prince for complex layouts, PDFKit for simple programmatic PDFs

## 📚 Resources

- Prince XML Documentation: https://www.princexml.com/doc/
- Prince CSS Reference: https://www.princexml.com/doc/formatting/
- Current Installation: `~/.local/prince/bin/prince`

