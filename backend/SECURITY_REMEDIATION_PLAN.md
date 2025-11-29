# 🔒 Backend Security Remediation Plan

**Date:** 2025-01-22
**Status:** In Progress
**Current Vulnerabilities:** 15 (4 low, 3 moderate, 8 high)

---

## Executive Summary

The backend has **15 security vulnerabilities** that need attention before production deployment. Most are in development dependencies and can be fixed with package updates. One critical dependency (xlsx) has NO FIX AVAILABLE and requires a mitigation strategy.

---

## Vulnerability Breakdown

### Current State
```
Total: 15 vulnerabilities
├─ 4 low (⚠️ Monitor)
├─ 3 moderate (🟡 Fix recommended)
└─ 8 high (🔴 Fix required)
```

### By Package
| Package | Severity | Count | Fix Available | Action |
|---------|----------|-------|---------------|--------|
| **xlsx** | High | 2 | ❌ NO | Mitigate or replace |
| **ws** | High | 1 | ⚠️ Breaking | Update carefully |
| **tar-fs** | High | 3 | ⚠️ Breaking | Update carefully |
| **glob** | High | 1 | ✅ Yes | Safe update |
| **inquirer** | High | 1 | ⚠️ Breaking | Update carefully |
| **js-yaml** | Moderate | 1 | ⚠️ Breaking | Update carefully |
| **nodemailer** | Moderate | 1 | ⚠️ Breaking | Update carefully |
| **Various** | Low | 4 | ✅ Yes | Safe update |

---

## Detailed Vulnerability Analysis

### 🔴 CRITICAL: xlsx (NO FIX AVAILABLE)

**Package:** `xlsx` (all versions)
**Severity:** HIGH
**Vulnerabilities:**
1. **GHSA-4r6h-8v6p-xvw6** - Prototype Pollution
2. **GHSA-5pgg-2g8v-p4x9** - Regular Expression Denial of Service (ReDoS)

**Impact:**
- Used for Excel file parsing in sales import module
- Potential for DoS attacks via malicious Excel files
- Prototype pollution could lead to security issues

**Fix Status:** ❌ **NO FIX AVAILABLE** (SheetJS not maintained)

**Options:**

#### Option 1: Replace with Alternative (RECOMMENDED)
```bash
npm uninstall xlsx
npm install exceljs
```

**Pros:**
- ✅ No vulnerabilities
- ✅ Actively maintained
- ✅ Better TypeScript support
- ✅ Similar API

**Cons:**
- ⚠️ Requires code changes in sales-import module
- ⚠️ Slightly different API

**Migration Example:**
```typescript
// BEFORE (xlsx):
import * as XLSX from 'xlsx';

const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// AFTER (exceljs):
import * as ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
const sheet = workbook.worksheets[0];
const data = sheet.getRows(1, sheet.rowCount).map(row =>
  row.values.slice(1) // Skip first empty cell
);
```

**Effort:** 4-6 hours (update sales-import module + testing)

---

#### Option 2: Mitigate Risk (IF replacement not possible immediately)

**Mitigation Strategy:**

1. **Input Validation:**
```typescript
// src/modules/sales-import/sales-import.service.ts

async processExcelFile(file: Express.Multer.File): Promise<void> {
  // 1. Validate file type
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException('Only .xlsx/.xls files allowed');
  }

  // 2. Validate file size (prevent DoS)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new BadRequestException('File too large (max 10MB)');
  }

  // 3. Validate file structure before parsing
  const buffer = file.buffer;
  if (buffer.length < 1000) {
    throw new BadRequestException('File too small to be valid Excel');
  }

  // 4. Set timeout for parsing (prevent ReDoS)
  const parseWithTimeout = (timeoutMs: number) => {
    return Promise.race([
      this.parseExcelFile(buffer),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Parsing timeout')), timeoutMs)
      )
    ]);
  };

  try {
    const data = await parseWithTimeout(5000); // 5 second timeout
  } catch (error) {
    if (error.message === 'Parsing timeout') {
      throw new BadRequestException('File parsing timeout - file may be malformed');
    }
    throw error;
  }

  // 5. Sanitize parsed data
  const sanitized = data.map(row => this.sanitizeObject(row));

  // 6. Validate against schema
  const validated = await this.validateSalesData(sanitized);

  return validated;
}

private sanitizeObject(obj: any): any {
  // Remove prototype pollution risks
  const clean = Object.create(null);
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && key !== '__proto__' && key !== 'constructor') {
      const value = obj[key];
      clean[key] = typeof value === 'object' ? this.sanitizeObject(value) : value;
    }
  }
  return clean;
}
```

2. **Rate Limiting (already configured ✅):**
```typescript
// app.module.ts
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100, // Only 100 upload requests per minute
}),
```

3. **User Permissions:**
```typescript
// Only admins and managers can upload Excel files
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Post('upload')
async upload(@UploadedFile() file: Express.Multer.File) {
  return this.salesImportService.processExcelFile(file);
}
```

4. **Security Exception Documentation:**
```
Risk Acceptance Form:
- Package: xlsx (all versions)
- Vulnerabilities: Prototype Pollution + ReDoS
- Business Justification: Required for Excel sales import
- Mitigations:
  1. File size limit (10MB)
  2. File type validation
  3. Parsing timeout (5s)
  4. Data sanitization
  5. Admin-only access
  6. Rate limiting (100 req/min)
- Residual Risk: LOW (with mitigations)
- Review Date: Monthly
- Planned Replacement: Q2 2025 (migrate to exceljs)
```

**Effort:** 2-3 hours (add mitigations) + ongoing monitoring

---

### 🔴 HIGH: ws (WebSocket Library)

**Package:** `ws` 8.0.0 - 8.17.0
**Severity:** HIGH
**Vulnerability:** GHSA-3h5v-q93c-6h6q - DoS when handling many HTTP headers

**Fix:**
```bash
npm install ws@latest  # Upgrades to 8.18.0+
```

**Breaking Changes:** None expected (minor version update)

**Testing Required:**
- [ ] WebSocket connections still work
- [ ] Telegram bot integration (uses ws internally)
- [ ] No regression in real-time features

**Effort:** 1 hour

---

### 🔴 HIGH: tar-fs (Archive Extraction)

**Package:** `tar-fs` 3.0.0 - 3.1.0
**Severity:** HIGH
**Vulnerabilities:**
1. Symlink validation bypass
2. Path traversal
3. Link following vulnerability

**Fix:**
```bash
npm install tar-fs@latest puppeteer@latest
```

**Breaking Changes:** Puppeteer major version (18 → 24)

**Impact:** Puppeteer is used for PDF generation

**Testing Required:**
- [ ] PDF report generation still works
- [ ] No layout changes in PDFs
- [ ] Performance acceptable

**Effort:** 2-3 hours

---

### 🔴 HIGH: glob (File Pattern Matching)

**Package:** `glob` 10.2.0 - 10.4.5
**Severity:** HIGH
**Vulnerability:** Command injection via -c/--cmd

**Fix:**
```bash
npm install glob@latest  # Safe fix
```

**Breaking Changes:** None

**Effort:** 15 minutes

---

### 🟡 MODERATE: js-yaml (YAML Parser)

**Package:** `js-yaml` 4.0.0 - 4.1.0
**Severity:** MODERATE
**Vulnerability:** Prototype pollution in merge (<<)

**Fix:**
```bash
npm install js-yaml@latest
# Also updates @nestjs/swagger which depends on it
```

**Breaking Changes:** May affect Swagger documentation generation

**Testing Required:**
- [ ] Swagger docs still generate
- [ ] API documentation accessible at /api/docs

**Effort:** 1 hour

---

### 🟡 MODERATE: nodemailer (Email Sending)

**Package:** `nodemailer` <7.0.7
**Severity:** MODERATE
**Vulnerability:** Email to unintended domain

**Fix:**
```bash
npm install nodemailer@latest  # 7.0.10+
```

**Breaking Changes:** None expected

**Testing Required:**
- [ ] Email notifications still work
- [ ] SMTP configuration unchanged
- [ ] Email templates render correctly

**Effort:** 1 hour

---

### 🟢 LOW SEVERITY (4 vulnerabilities)

**Packages:** Various development dependencies
**Action:** Accept risk or upgrade during routine maintenance
**Risk Level:** Very Low (dev dependencies only)

---

## Remediation Plan

### Phase 1: Safe Fixes (Day 1 - 2 hours)

**No breaking changes, can deploy immediately:**

```bash
cd backend

# 1. Update glob (safe)
npm install glob@latest

# 2. Update any other safe fixes
npm audit fix

# 3. Verify build
npm run build

# 4. Run tests
npm run test

# 5. Verify no regressions
```

**Expected Result:** 15 → ~10 vulnerabilities

---

### Phase 2: Breaking Changes (Day 2 - 4 hours)

**Requires testing before deployment:**

```bash
# 1. Update ws
npm install ws@latest

# Test WebSocket/Telegram integration
npm run test -- --testPathPattern=telegram

# 2. Update nodemailer
npm install nodemailer@latest

# Test email functionality
npm run test -- --testPathPattern=email

# 3. Update js-yaml
npm install js-yaml@latest

# Test Swagger docs
curl http://localhost:3000/api/docs

# 4. Update puppeteer (requires most testing)
npm install puppeteer@latest tar-fs@latest

# Test PDF generation
npm run test -- --testPathPattern=reports

# 5. Full regression test
npm run test:e2e
```

**Expected Result:** 15 → 2 vulnerabilities (only xlsx remains)

---

### Phase 3: xlsx Replacement (Week 2 - 4-6 hours)

**Option A: Replace with exceljs (RECOMMENDED)**

```bash
# 1. Install replacement
npm uninstall xlsx
npm install exceljs

# 2. Update sales-import module
# Edit: src/modules/sales-import/sales-import.service.ts
# See migration example above

# 3. Update tests
# Edit: src/modules/sales-import/sales-import.service.spec.ts

# 4. Test with real Excel files
# Upload sample sales data files
# Verify parsing is correct
# Check performance is acceptable

# 5. Deploy
```

**Expected Result:** 15 → 0 vulnerabilities ✅

---

**Option B: Mitigate xlsx risks (TEMPORARY)**

```bash
# 1. Add input validation (see mitigation strategy above)
# 2. Document security exception
# 3. Schedule replacement for Q2 2025
# 4. Monthly vulnerability monitoring
```

**Expected Result:** 15 → 2 vulnerabilities (accepted risk)

---

## Testing Checklist

After each phase, verify:

### Build & Compilation
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` has 0 errors
- [ ] No new TypeScript errors introduced

### Automated Tests
- [ ] `npm run test` passes (unit tests)
- [ ] `npm run test:e2e` passes (E2E tests)
- [ ] Test coverage remains >70%

### Functional Testing
- [ ] Swagger docs load at `/api/docs`
- [ ] WebSocket connections work
- [ ] Telegram bot responds
- [ ] Email notifications send
- [ ] PDF reports generate correctly
- [ ] Excel sales import works
- [ ] No console errors in logs

### Performance Testing
- [ ] Response times <500ms for P95
- [ ] PDF generation <3s
- [ ] Excel parsing <5s for 1000 rows
- [ ] No memory leaks

---

## Deployment Strategy

### Recommended Approach: Phased Rollout

**Week 1: Safe Fixes (Phase 1)**
- Deploy glob update
- Monitor for 48 hours
- No user-facing changes expected

**Week 2: Breaking Changes (Phase 2)**
- Deploy ws, nodemailer, js-yaml updates
- Monitor WebSocket connections, emails
- Rollback plan: `git revert` + redeploy

**Week 3: xlsx Decision**
- Option A: Replace with exceljs (recommended)
- Option B: Document accepted risk

**Week 4: Final Verification**
- Run full security audit
- Confirm 0 vulnerabilities (or accepted risks)
- Update security documentation

---

## Rollback Plan

If any update causes issues:

```bash
# 1. Revert package.json changes
git checkout HEAD~1 -- package.json package-lock.json

# 2. Reinstall previous versions
npm ci

# 3. Rebuild
npm run build

# 4. Redeploy
npm run start:prod

# 5. Verify functionality restored
```

---

## Security Monitoring

### Ongoing Practices

**Daily:**
- Monitor error logs for unusual patterns
- Check for failed upload attempts

**Weekly:**
- Review npm audit results
- Check for new vulnerabilities

**Monthly:**
- Security scan with `npm audit`
- Review accepted risk exceptions
- Update packages to latest patches

**Quarterly:**
- Full security audit
- Penetration testing
- Dependency review

---

## Risk Assessment

### Current Risk Level: 🟠 MEDIUM

**Without Fixes:**
- High: Potential DoS via xlsx ReDoS
- High: Path traversal via tar-fs
- Medium: Prototype pollution via js-yaml

**With Phase 1+2 Fixes:**
- Risk Level: 🟡 LOW-MEDIUM
- Only xlsx vulnerabilities remain
- Mitigations in place

**With Phase 3 (xlsx replacement):**
- Risk Level: 🟢 LOW
- Zero vulnerabilities
- Production-ready security posture

---

## Recommendations

### Priority 1 (This Week): ✅
1. Execute Phase 1 (safe fixes) - 2 hours
2. Execute Phase 2 (breaking changes) - 4 hours
3. Document mitigation for xlsx - 1 hour

**Total Effort:** 1 day
**Result:** 15 → 2 vulnerabilities

### Priority 2 (Next Week): 🎯
1. Replace xlsx with exceljs - 6 hours
2. Full regression testing - 2 hours
3. Deploy to production - 1 hour

**Total Effort:** 1-2 days
**Result:** 2 → 0 vulnerabilities ✅

### Priority 3 (Ongoing): 📊
1. Set up automated security scanning (Snyk/Dependabot)
2. Add security checks to CI/CD pipeline
3. Monthly vulnerability reviews

---

## Conclusion

The backend has **15 vulnerabilities** that can be reduced to **ZERO** with focused effort over 2 weeks:

- **Week 1:** Safe + breaking change updates → 2 vulnerabilities remaining
- **Week 2:** xlsx replacement → 0 vulnerabilities ✅

**Recommended Path:**
1. Execute Phase 1+2 immediately (1 day)
2. Schedule xlsx replacement (Week 2)
3. Achieve zero vulnerabilities before production deployment

**Alternative (If xlsx replacement blocked):**
1. Execute Phase 1+2 (1 day)
2. Implement xlsx mitigations (2 hours)
3. Document accepted risk
4. Deploy with 2 vulnerabilities (mitigated)
5. Plan xlsx replacement for Q2 2025

---

**Report Created:** 2025-01-22
**Next Review:** After Phase 1+2 completion
**Owner:** Backend Development Team
**Status:** 🟠 In Progress
