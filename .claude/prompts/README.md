# Analysis Prompts

This directory contains comprehensive prompts for various project analysis tasks.

## 📋 Available Prompts

### 1. `project-analysis.md` - Comprehensive Project Analysis

**Purpose**: Deep, multi-dimensional analysis of the entire VendHub project

**Use when you need to**:
- Assess overall project health
- Identify critical issues and improvements
- Prepare for production deployment
- Onboard technical leadership
- Plan refactoring initiatives
- Conduct code review at scale

**Estimated time**: 4-6 hours for complete analysis

**Key areas covered**:
- Architecture (backend, frontend, database)
- Code quality and standards
- Security vulnerabilities
- Performance optimization
- Testing coverage and quality
- API design consistency
- Database optimization
- DevOps readiness
- Documentation quality
- Business logic validation

---

### 2. `quick-analysis.md` - Quick Health Check

**Purpose**: Fast 30-60 minute project health assessment

**Use when you need to**:
- Weekly code quality check
- Pre-commit validation
- Quick health snapshot
- Identify immediate issues

**Estimated time**: 30-60 minutes

**Key areas covered**:
- Automated checks (ESLint, TypeScript, tests, security)
- Code patterns (any usage, console.log, secrets)
- Database migrations
- Security scan
- Architecture compliance
- Performance basics

---

### 3. `dictionary-analysis.md` - Dictionary/Reference Data Analysis

**Purpose**: Analyze reference data (dictionaries) implementation and quality

**Use when you need to**:
- Audit dictionary completeness
- Check for missing reference data
- Validate data quality
- Plan dictionary migrations
- Prepare for fiscal/regulatory compliance

**Estimated time**: 1-2 hours

**Key areas covered**:
- Dictionary inventory (25 implemented, 8 missing)
- Data quality checks (completeness, uniqueness, consistency)
- Hardcoded enum migration analysis
- Uzbekistan-specific requirements (VAT, fiscal codes)
- Performance optimization (caching, indexes)
- Implementation plan for missing dictionaries

**Current State**:
- ✅ 25 dictionaries implemented
- ⚠️ 8 critical dictionaries missing
- ⚠️ 85+ hardcoded enums need migration
- ⚠️ Missing Uzbekistan VAT groups

**Quick Check**:
```bash
# Check dictionary coverage
cd backend
npm run seed:dictionaries -- --dry-run

# Validate dictionary usage
grep -r "_code" src/modules/*/entities/*.entity.ts
```

---

## 🚀 How to Use These Prompts

### Option 1: Use with Claude Code (Recommended)

```bash
# Copy the entire prompt content and paste it in a conversation
cat .claude/prompts/project-analysis.md | pbcopy  # macOS
cat .claude/prompts/project-analysis.md | xclip   # Linux
```

Then paste into Claude Code and add:
```
Please perform this comprehensive analysis on the VendHub project.
Start with automated analysis, then proceed with manual review.
Focus on [specific areas if needed, e.g., "security and performance"].
```

### Option 2: Use with GitHub Copilot

Add to your workspace settings:
```json
{
  "github.copilot.advanced": {
    "analysisPrompt": ".claude/prompts/project-analysis.md"
  }
}
```

### Option 3: Manual Review Checklist

Print the prompt and use it as a checklist for manual code review sessions.

---

## 📊 Expected Outputs

After running the comprehensive analysis, you should receive:

1. **Executive Summary**
   - Project health score
   - Top 10 critical issues
   - Quick wins
   - Priority recommendations

2. **Detailed Report**
   - Category-by-category findings
   - Code examples
   - Severity ratings
   - Effort estimates

3. **Improvement Roadmap**
   - Phased action plan
   - Timeline estimates
   - Dependency mapping

4. **Actionable Task List**
   - Ready for project management tools
   - Prioritized by impact × effort

---

## 🎯 Quick Start

For a quick analysis (30-60 min), focus on:

```markdown
Quick Analysis Request:

Using the comprehensive project analysis prompt, perform a QUICK analysis focusing on:

1. **Critical Security Issues** (15 min)
   - Run: npm audit
   - Check authentication/authorization
   - Review input validation

2. **Immediate Code Quality Wins** (15 min)
   - Run: npm run lint
   - Check for `any` type usage
   - Find duplicate code

3. **Top 5 Performance Issues** (15 min)
   - Identify slow queries
   - Check missing indexes
   - Review N+1 problems

4. **Critical Test Gaps** (15 min)
   - Check coverage: npm run test:cov
   - Identify untested critical paths

Deliverable: Top 10 issues ranked by severity + effort
```

---

## 🔄 Regular Analysis Schedule

### Weekly Quick Check (30 min)
- Run automated tools
- Check new code since last check
- Review recent commits

### Monthly Deep Dive (2-3 hours)
- Focus on 1-2 modules
- Run performance analysis
- Update documentation

### Quarterly Comprehensive Review (4-6 hours)
- Full project analysis
- Update roadmap
- Plan next quarter improvements

---

## 🛠️ Tools Setup

Before running analysis, ensure you have:

```bash
# Backend
cd backend
npm install

# Run all checks
npm run lint
npm run type-check
npm run test:cov
npm audit

# Frontend
cd frontend
npm install
npm run lint
npm run type-check
npm run build
```

Optional but recommended:

```bash
# Install additional analysis tools
npm install -g @typescript-eslint/parser
npm install -g typescript-coverage-report
npm install -g madge  # Circular dependency detection
```

---

## 📈 Tracking Progress

Create a GitHub issue for tracking:

```markdown
Title: Q1 2025 Comprehensive Project Analysis

## Analysis Status
- [x] Automated analysis completed
- [x] Manual code review (5/10 modules)
- [ ] Performance testing
- [ ] Documentation review

## Key Findings
1. [Critical] SQL injection vulnerability in sales-import module
2. [High] Missing test coverage in inventory module (42%)
3. [Medium] 15 instances of `any` type usage

## Action Items
- [ ] #123 Fix SQL injection in sales-import
- [ ] #124 Add inventory module tests
- [ ] #125 Remove `any` type usage

## Next Review: 2025-02-15
```

---

## 💡 Tips for Best Results

1. **Set Clear Scope**
   - Full analysis vs. focused analysis
   - Specific modules vs. entire project
   - Time budget (quick vs. thorough)

2. **Provide Context**
   - Current project phase (MVP, Beta, Production)
   - Team size and skills
   - Timeline constraints

3. **Be Specific About Concerns**
   - "Focus on security for production launch"
   - "Prioritize performance for mobile users"
   - "Check test coverage before hiring QA"

4. **Request Actionable Output**
   - Prioritized task list
   - Effort estimates
   - Code examples

5. **Follow Up**
   - Create GitHub issues from findings
   - Assign owners
   - Track completion
   - Schedule follow-up review

---

## 🎓 Learning from Analysis

Use analysis results to:

- **Improve Team Skills**
  - Share common mistakes in team meetings
  - Create coding guidelines from findings
  - Add pre-commit hooks for common issues

- **Update Documentation**
  - Add FAQs based on recurring issues
  - Update CLAUDE.md with new patterns
  - Create troubleshooting guides

- **Automate Checks**
  - Add ESLint rules for common problems
  - Create custom linters
  - Improve CI/CD pipeline

---

## 📞 Questions?

If analysis results are unclear:

1. Review the specific section in `project-analysis.md`
2. Check examples in the codebase
3. Consult `.claude/rules.md` for conventions
4. Ask for clarification with specific code examples

---

**Pro Tip**: Bookmark this directory and reference it before:
- Major releases
- Team onboarding
- Architecture decisions
- Refactoring initiatives
- Performance optimization
- Security audits

Happy analyzing! 🚀
