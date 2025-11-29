# Branch Protection Setup Guide

This guide explains how to configure GitHub branch protection rules for the VendHub repository.

## Quick Setup

Go to: **GitHub Repository → Settings → Branches → Add branch protection rule**

## Main Branch Protection (`main`)

### Required Settings

| Setting                              | Value                                | Purpose                       |
| ------------------------------------ | ------------------------------------ | ----------------------------- |
| Branch name pattern                  | `main`                               | Protects production branch    |
| Require pull request reviews         | ✅ Enabled                           | Code review required          |
| Required approving reviews           | `1` (recommend `2` for production)   | Minimum reviewers             |
| Dismiss stale pull request approvals | ✅ Enabled                           | Re-review after changes       |
| Require review from Code Owners      | ✅ Enabled (after adding CODEOWNERS) | Ensures domain experts review |
| Require status checks to pass        | ✅ Enabled                           | CI must pass                  |
| Require branches to be up to date    | ✅ Enabled                           | Prevents merge conflicts      |
| Status checks required               | See list below                       | Specific jobs                 |

### Required Status Checks

Select these from the dropdown:

```
✅ Backend Lint
✅ Backend Tests
✅ Frontend Lint
✅ Frontend Build
✅ Secret Scanning
✅ Security Audit
✅ CI Summary
```

### Additional Restrictions

| Setting                | Value          | Purpose                 |
| ---------------------- | -------------- | ----------------------- |
| Require signed commits | Optional       | Enhanced security       |
| Require linear history | ✅ Recommended | Clean git history       |
| Include administrators | ✅ Enabled     | No exceptions           |
| Restrict who can push  | ✅ Enabled     | Only via PR             |
| Allow force pushes     | ❌ Disabled    | Prevent history rewrite |
| Allow deletions        | ❌ Disabled    | Prevent branch deletion |

## Develop Branch Protection (`develop`)

### Required Settings

| Setting                       | Value        |
| ----------------------------- | ------------ |
| Branch name pattern           | `develop`    |
| Require pull request reviews  | ✅ Enabled   |
| Required approving reviews    | `1`          |
| Require status checks to pass | ✅ Enabled   |
| Status checks required        | Same as main |

## Step-by-Step Instructions

### 1. Navigate to Branch Protection

```
1. Go to https://github.com/jamsmac/VendHub
2. Click "Settings" tab
3. Click "Branches" in left sidebar
4. Click "Add branch protection rule"
```

### 2. Configure Main Branch

```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale pull request approvals when new commits are pushed
   ✅ Require review from Code Owners

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   Search and add:
   - "Backend Tests"
   - "Frontend Build"
   - "Secret Scanning"
   - "Security Audit"

✅ Require conversation resolution before merging

❌ Do not require signed commits (optional)
✅ Require linear history (recommended)

✅ Do not allow bypassing the above settings

❌ Do not allow force pushes
❌ Do not allow deletions
```

### 3. Save and Verify

Click "Create" or "Save changes", then verify by:

1. Try pushing directly to `main` - should be blocked
2. Create a PR and try merging without approval - should be blocked
3. Create a PR with failing tests - merge should be blocked

## CODEOWNERS File

Create `.github/CODEOWNERS` to require specific reviewers:

```
# Default owners for everything
* @jamsmac

# Backend specific
/backend/ @jamsmac
/backend/src/modules/auth/ @jamsmac

# Frontend specific
/frontend/ @jamsmac

# DevOps/CI
/.github/ @jamsmac
/docker-compose*.yml @jamsmac
/monitoring/ @jamsmac

# Documentation
/docs/ @jamsmac
*.md @jamsmac
```

## Verification Checklist

After setup, verify:

- [ ] Direct push to `main` is blocked
- [ ] PRs require at least 1 approval
- [ ] PRs require CI to pass
- [ ] Status checks are visible on PRs
- [ ] Merge blocked if status checks fail
- [ ] Force push is blocked
- [ ] Branch deletion is blocked

## Common Issues

### "X status checks are expected"

The CI workflow must have run at least once for status checks to appear.
Run the workflow on a feature branch first.

### Status checks not appearing

Ensure the job names in `.github/workflows/ci.yml` match exactly:

- `Backend Tests` (not `backend-test`)
- `Frontend Build` (not `frontend-build`)

### Need to bypass in emergency

Admins can bypass if "Include administrators" is unchecked.
This should be rare and documented.

## Related Documentation

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [VendHub CI/CD Pipeline](.github/workflows/ci.yml)
- [VendHub Deployment](.github/workflows/deploy.yml)
