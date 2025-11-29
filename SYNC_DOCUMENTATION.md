# VH-M24 Synchronization Documentation

## Overview

VH-M24 is automatically synchronized with the main VendHub Manager repository. This ensures that all updates, bug fixes, and new features are continuously integrated.

## Synchronization Methods

### 1. Automatic Sync on Push (Immediate)
- **Trigger:** When code is pushed to VendHub Manager main branch
- **Scope:** Changes to:
  - `client/` - React frontend
  - `server/` - tRPC API backend
  - `drizzle/` - Database migrations
  - `shared/` - Shared types and constants
  - `package.json` - Dependencies
  - Configuration files

**Workflow:** `.github/workflows/sync-from-vendhub.yml`

### 2. Scheduled Sync (Every 6 Hours)
- **Trigger:** Automatic schedule (0, 6, 12, 18 UTC)
- **Scope:** All changes from VendHub Manager
- **Behavior:** 
  - Checks for updates
  - Only pulls if new commits exist
  - Creates merge commit with timestamp

**Workflow:** `.github/workflows/scheduled-sync.yml`

### 3. Manual Sync (On Demand)
- **Trigger:** GitHub Actions "Run workflow" button
- **Scope:** All changes from VendHub Manager
- **Use Case:** Force immediate sync if needed

## Synchronization Process

```
VendHub Manager (jamsmac/VendHub)
           ↓
    GitHub Actions Workflow
           ↓
    Fetch latest changes
           ↓
    Merge into VH-M24
           ↓
    Push to main branch
           ↓
VH-M24 (jamsmac/VHM24)
```

## What Gets Synced

### ✅ Automatically Synced
- Frontend code (React components, pages, styles)
- Backend API (tRPC routers, database functions)
- Database migrations and schema
- Type definitions and shared utilities
- Configuration files
- Tests and test data
- Documentation

### ⚠️ Potentially Conflicting
- Local configuration overrides
- Environment-specific settings
- Custom modifications

## Conflict Resolution

If merge conflicts occur:
1. GitHub Actions will attempt automatic merge
2. If conflicts exist, workflow continues with `continue-on-error: true`
3. Manual intervention may be required
4. Review conflicts in pull requests or commits

## Monitoring Synchronization

### View Sync Status
1. Go to https://github.com/jamsmac/VHM24
2. Click "Actions" tab
3. View "Sync from VendHub Manager" and "Scheduled Sync from VendHub Manager" workflows

### Check Last Sync
```bash
git log --oneline | grep -i "sync"
```

### View Sync History
```bash
git log --grep="Sync" --oneline
```

## Manual Synchronization

If automatic sync fails or you need immediate sync:

```bash
# Add VendHub as remote
git remote add vendhub https://github.com/jamsmac/VendHub.git

# Fetch latest
git fetch vendhub main

# Merge
git merge vendhub/main

# Push
git push origin main
```

## Configuration

### Adjusting Sync Frequency
Edit `.github/workflows/scheduled-sync.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Change frequency here
```

Cron format: `minute hour day month day-of-week`
- `0 */6 * * *` = Every 6 hours
- `0 0 * * *` = Daily at midnight
- `0 */4 * * *` = Every 4 hours

### Changing Synced Paths
Edit `.github/workflows/sync-from-vendhub.yml`:
```yaml
paths:
  - 'client/**'
  - 'server/**'
  # Add or remove paths as needed
```

## Troubleshooting

### Sync Not Triggering
1. Check GitHub Actions is enabled in repository settings
2. Verify workflow files are in `.github/workflows/`
3. Check branch protection rules don't block pushes

### Merge Conflicts
1. Review conflict in GitHub
2. Resolve manually if needed
3. Commit resolution
4. Push to main

### Missing Updates
1. Check last sync timestamp in Actions tab
2. Manually trigger sync workflow
3. Verify VendHub Manager has new commits

## Best Practices

1. **Review Changes:** Check sync commits before pulling locally
2. **Test After Sync:** Run tests after major syncs
3. **Communicate:** Notify team of significant syncs
4. **Backup:** Keep local backups of critical configurations
5. **Monitor:** Regularly check sync status

## Support

For issues with synchronization:
1. Check GitHub Actions logs
2. Review merge conflicts
3. Contact repository maintainer
4. Create issue with sync details

---

**Last Updated:** 2025-11-29
**Sync Workflows:** 2 active
**Sync Frequency:** Every 6 hours + on-push
