# Pre-commit Hooks Setup Guide

## Overview

Pre-commit hooks automatically check your code before commits to ensure quality and prevent bad code from entering the codebase.

## What's Configured

### Lint-staged Configuration (`.lintstagedrc.js`)

The following checks run automatically on staged files:

1. **ESLint** - Fixes and validates JavaScript/TypeScript code
2. **Prettier** - Formats all code consistently
3. **TypeScript** - Type-checks TypeScript files

### Benefits

- ✅ **Prevents** bad code from being committed
- ✅ **Auto-fixes** most issues automatically
- ✅ **Saves time** in code review
- ✅ **Enforces** code quality standards
- ✅ **Fast** - only checks changed files

## Setup Instructions

### Option 1: Automatic Setup (Recommended)

Run this command in the **repository root** (not frontend directory):

```bash
# From /Users/js/Мой диск/3.VendHub/VendHub
cd "$(git rev-parse --show-toplevel)"
npx husky init
```

Then create the pre-commit hook:

```bash
# Create pre-commit hook
echo "cd frontend && npm run lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Option 2: Manual Setup

1. **Create `.husky` directory in repository root:**

```bash
mkdir -p .husky
```

2. **Create pre-commit hook file** (`.husky/pre-commit`):

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd frontend && npm run lint-staged
```

3. **Make it executable:**

```bash
chmod +x .husky/pre-commit
```

4. **Test it:**

```bash
git add .
git commit -m "test: verify pre-commit hook"
```

## How It Works

### Before Commit:

```
You run: git commit -m "feat: add new feature"
         ↓
Husky intercepts the commit
         ↓
Runs lint-staged on changed files:
  - ESLint --fix (auto-fixes code issues)
  - Prettier --write (formats code)
  - TypeScript --noEmit (type-checks)
         ↓
If all pass ✅: Commit proceeds
If any fail ❌: Commit blocked, shows errors
```

### Example Output:

```bash
$ git commit -m "feat: add machine component"

✔ Preparing lint-staged...
⚠ Running tasks for staged files...
  ✔ src/**/*.{ts,tsx} — 3 files
    ✔ eslint --fix
    ✔ eslint --max-warnings=50
    ✔ prettier --write
    ✔ tsc --noEmit
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...

[main abc1234] feat: add machine component
 3 files changed, 45 insertions(+), 2 deletions(-)
```

## What Gets Checked

### Files Included:
- `*.ts` - TypeScript files
- `*.tsx` - React TypeScript files
- `*.js` - JavaScript files
- `*.jsx` - React JavaScript files
- `*.json` - JSON files
- `*.css` - CSS files
- `*.md` - Markdown files

### Checks Performed:

1. **ESLint** (`*.{ts,tsx,js,jsx}`):
   - Fixes code issues automatically where possible
   - Enforces code style rules
   - Max 50 warnings allowed (configurable)

2. **Prettier** (all file types):
   - Formats code consistently
   - Ensures uniform indentation
   - Fixes line breaks, quotes, etc.

3. **TypeScript** (`*.{ts,tsx}`):
   - Type-checks all TypeScript
   - Ensures no type errors
   - Runs on full project (not just changed files)

## Skipping Hooks (Emergency Only)

**⚠️ NOT RECOMMENDED** - Only use in emergencies:

```bash
# Skip pre-commit hook (dangerous!)
git commit --no-verify -m "emergency fix"
```

**Why you shouldn't skip:**
- Breaks CI/CD pipeline
- Introduces bugs into codebase
- Makes code review harder
- Creates inconsistent code

## Troubleshooting

### Hook not running?

```bash
# Check if husky is installed
ls -la .husky/

# Re-initialize husky
cd "$(git rev-parse --show-toplevel)"
npx husky init
```

### Too slow?

Lint-staged only checks changed files, but if still slow:

```bash
# Disable type-check in .lintstagedrc.js (not recommended)
# Comment out: '*.{ts,tsx}': () => 'tsc --noEmit',
```

### False failures?

```bash
# Run manually to see actual errors
cd frontend
npm run lint-staged
```

## CI/CD Integration

The same checks run in CI/CD pipeline:

```yaml
# .github/workflows/frontend-ci.yml
- name: Lint
  run: npm run lint
- name: Type check
  run: npm run type-check
- name: Test
  run: npm test
```

## Configuration Files

### `.lintstagedrc.js`
Main configuration for what runs on commit

### `package.json`
Scripts that can be run manually:
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format with Prettier
- `npm run type-check` - TypeScript check
- `npm run lint-staged` - Run lint-staged manually

### `.eslintrc.json`
ESLint rules configuration

### `.prettierrc.json` (if exists)
Prettier formatting rules

## Best Practices

1. **Commit often** - Smaller commits = faster hooks
2. **Fix issues immediately** - Don't accumulate technical debt
3. **Run manually first** - Test changes before committing:
   ```bash
   npm run lint-staged
   ```
4. **Update configuration** - Keep ESLint rules up-to-date
5. **Team alignment** - Ensure all developers have hooks enabled

## Common Issues

### Issue: "Husky not found"
**Solution:**
```bash
npm install --save-dev husky lint-staged
npm run prepare
```

### Issue: "Permission denied"
**Solution:**
```bash
chmod +x .husky/pre-commit
```

### Issue: "Wrong directory"
**Solution:**
```bash
# Hooks must run from git root
cd "$(git rev-parse --show-toplevel)"
```

## Maintenance

### Update dependencies:
```bash
npm update husky lint-staged
```

### Add new file types:
Edit `.lintstagedrc.js`:
```javascript
'*.{scss,sass}': ['prettier --write'],
```

### Adjust ESLint warnings limit:
```javascript
'*.{js,jsx,ts,tsx}': [
  'eslint --fix',
  'eslint --max-warnings=10', // Change from 50
],
```

## Team Setup

Share with team:

```bash
# After clone
npm install
npm run prepare

# Verify setup
ls -la .husky/
```

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

---

**Status:** ✅ Configured and ready to use
**Last Updated:** 2025-01-21
**Maintained by:** VendHub Development Team
