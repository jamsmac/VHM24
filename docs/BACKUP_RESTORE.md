# VendHub Manager - Backup & Restore Guide

Comprehensive guide for backing up and restoring VendHub Manager data.

## Table of Contents

- [Overview](#overview)
- [Backup Strategy](#backup-strategy)
- [Prerequisites](#prerequisites)
- [Manual Backups](#manual-backups)
- [Automated Backups](#automated-backups)
- [Restore Procedures](#restore-procedures)
- [Disaster Recovery](#disaster-recovery)
- [Monitoring & Verification](#monitoring--verification)
- [Best Practices](#best-practices)

## Overview

VendHub Manager uses three main data stores that need to be backed up:

1. **PostgreSQL Database** - Core application data (users, tasks, commissions, contracts, etc.)
2. **Redis** - Cache and BullMQ queue data
3. **MinIO (S3)** - File storage (uploads, documents, images)

## Backup Strategy

### Retention Policy

| Backup Type | Frequency | Retention | Storage Location |
|------------|-----------|-----------|-----------------|
| Database   | Daily     | 30 days   | `/var/backups/vendhub` |
| Redis      | Daily     | 7 days    | `/var/backups/vendhub` |
| MinIO      | Daily     | 30 days   | `/var/backups/vendhub` |
| Full System| Weekly    | 90 days   | Off-site storage |

### Backup Schedule

```
┌─────────────────────────────────────────────────────────┐
│ Daily Backups (2:00 AM Asia/Tashkent)                  │
│ - PostgreSQL database backup                           │
│ - Redis data backup                                    │
│ - MinIO S3 buckets backup                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Weekly Backups (Sunday 3:00 AM)                        │
│ - Full system backup                                   │
│ - Copy to off-site storage                            │
│ - Verify backup integrity                             │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

```bash
# PostgreSQL client tools
apt-get install postgresql-client

# Redis client
apt-get install redis-tools

# MinIO client
wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
chmod +x /usr/local/bin/mc
```

### Environment Variables

Create `/etc/vendhub/backup.env`:

```bash
# Database
DATABASE_NAME=vendhub
DATABASE_USER=vendhub
DATABASE_PASSWORD=your_strong_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# MinIO
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key

# Backup settings
BACKUP_DIR=/var/backups/vendhub
BACKUP_RETENTION_DAYS=30

# Optional: Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Load environment variables:

```bash
source /etc/vendhub/backup.env
```

## Manual Backups

### 1. Database Backup

```bash
cd /opt/vendhub/scripts/backup
./backup-database.sh /var/backups/vendhub
```

**Output:**
```
==========================================
VendHub Database Backup
==========================================
Database: vendhub
Host: localhost:5432
Backup file: /var/backups/vendhub/vendhub_db_20250115_020000.sql.gz
==========================================
[1/4] Creating database backup...
[2/4] Compressing backup...
[3/4] Verifying backup...
✅ Backup created successfully: vendhub_db_20250115_020000.sql.gz (245M)
[4/4] Cleaning old backups (keeping last 30 days)...

✅ Backup completed successfully!
```

### 2. Redis Backup

```bash
./backup-redis.sh /var/backups/vendhub
```

### 3. MinIO Backup

```bash
./backup-minio.sh /var/backups/vendhub
```

### 4. Full System Backup

```bash
./backup-all.sh /var/backups/vendhub
```

**This will:**
- Backup PostgreSQL database
- Backup Redis data
- Backup MinIO S3 buckets
- Generate a comprehensive log file
- Clean up old backups based on retention policy

## Automated Backups

### Using Cron

Create `/etc/cron.d/vendhub-backup`:

```bash
# VendHub Backup Schedule
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Load environment variables
BASH_ENV=/etc/vendhub/backup.env

# Daily database backup at 2:00 AM
0 2 * * * root /opt/vendhub/scripts/backup/backup-database.sh /var/backups/vendhub

# Daily Redis backup at 2:15 AM
15 2 * * * root /opt/vendhub/scripts/backup/backup-redis.sh /var/backups/vendhub

# Daily MinIO backup at 2:30 AM
30 2 * * * root /opt/vendhub/scripts/backup/backup-minio.sh /var/backups/vendhub

# Weekly full backup on Sunday at 3:00 AM
0 3 * * 0 root /opt/vendhub/scripts/backup/backup-all.sh /var/backups/vendhub
```

Enable cron:

```bash
chmod 644 /etc/cron.d/vendhub-backup
service cron reload
```

### Using Systemd Timers

Create `/etc/systemd/system/vendhub-backup.service`:

```ini
[Unit]
Description=VendHub Full System Backup
After=network.target

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/vendhub/backup.env
ExecStart=/opt/vendhub/scripts/backup/backup-all.sh /var/backups/vendhub
StandardOutput=journal
StandardError=journal
```

Create `/etc/systemd/system/vendhub-backup.timer`:

```ini
[Unit]
Description=VendHub Backup Timer
Requires=vendhub-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
systemctl enable vendhub-backup.timer
systemctl start vendhub-backup.timer
systemctl list-timers  # Verify
```

## Restore Procedures

### 1. Database Restore

⚠️ **WARNING:** This will REPLACE all existing data!

```bash
# Stop application first
docker-compose down backend commission-worker job-scheduler

# Restore database
cd /opt/vendhub/scripts/backup
./restore-database.sh /var/backups/vendhub/vendhub_db_20250115_020000.sql.gz

# Start application
docker-compose up -d
```

**Interactive restore:**
```
==========================================
VendHub Database Restore
==========================================
⚠️  WARNING: This will REPLACE all data in the database!

Database: vendhub
Host: localhost:5432
Backup file: /var/backups/vendhub/vendhub_db_20250115_020000.sql.gz
==========================================

Are you sure you want to continue? (yes/no): yes

[1/5] Decompressing backup...
[2/5] Terminating active connections...
[3/5] Recreating database...
[4/5] Restoring database from backup...
[5/5] Cleaning up temporary files...

✅ Database restored successfully!
```

### 2. Redis Restore

```bash
# Stop Redis
docker-compose stop redis

# Copy backup file
docker cp /var/backups/vendhub/vendhub_redis_20250115_020000.rdb vendhub-redis:/data/dump.rdb

# Start Redis
docker-compose start redis
```

### 3. MinIO Restore

```bash
# Extract backup
cd /var/backups/vendhub
tar -xzf vendhub_minio_20250115_020000.tar.gz

# Restore using mc
mc alias set vendhub http://localhost:9000 ACCESS_KEY SECRET_KEY
mc mirror vendhub/ vendhub/vendhub/
```

## Disaster Recovery

### Complete System Recovery

If the entire system is lost, follow these steps:

#### 1. Provision New Server

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install docker-compose-plugin

# Clone repository
git clone https://github.com/your-org/vendhub.git /opt/vendhub
cd /opt/vendhub
```

#### 2. Restore Configuration

```bash
# Copy environment files
cp .env.production.example .env.production
# Edit and fill in correct values

# Create backup directory
mkdir -p /var/backups/vendhub
```

#### 3. Start Infrastructure

```bash
# Start only database services first
docker-compose -f docker-compose.prod.yml up -d postgres redis minio

# Wait for services to be healthy
docker-compose -f docker-compose.prod.yml ps
```

#### 4. Restore Data

```bash
# Restore database
./scripts/backup/restore-database.sh /path/to/backup/vendhub_db_YYYYMMDD_HHMMSS.sql.gz

# Restore Redis
docker cp /path/to/backup/vendhub_redis_YYYYMMDD_HHMMSS.rdb vendhub-redis:/data/dump.rdb
docker-compose restart redis

# Restore MinIO
cd /tmp
tar -xzf /path/to/backup/vendhub_minio_YYYYMMDD_HHMMSS.tar.gz
mc mirror vendhub/ vendhub/vendhub/
```

#### 5. Start Application

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify health
curl http://localhost/health
```

#### 6. Verify Recovery

```bash
# Check logs
docker-compose logs -f backend

# Test login
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendhub.com","password":"password"}'

# Check database
docker-compose exec postgres psql -U vendhub -c "SELECT COUNT(*) FROM users;"

# Check queue
curl http://localhost/health/queues
```

## Monitoring & Verification

### Backup Verification

Create `/opt/vendhub/scripts/backup/verify-backups.sh`:

```bash
#!/bin/bash
# Verify recent backups exist and are valid

BACKUP_DIR="/var/backups/vendhub"
TODAY=$(date +"%Y%m%d")

# Check if today's backups exist
for type in db redis minio; do
  FILES=$(find "$BACKUP_DIR" -name "vendhub_${type}_${TODAY}*" -type f)
  if [ -z "$FILES" ]; then
    echo "❌ No ${type} backup found for today"
  else
    echo "✅ ${type} backup found: $(basename $FILES)"
  fi
done
```

### Monitoring Backup Size

```bash
# Track backup growth over time
du -sh /var/backups/vendhub/vendhub_db_* | tail -n 30
```

### Alerting

Integrate with your monitoring system:

```bash
# Prometheus metrics
cat > /var/lib/node_exporter/textfile_collector/vendhub_backup.prom << EOF
# HELP vendhub_backup_age_seconds Age of latest backup in seconds
# TYPE vendhub_backup_age_seconds gauge
vendhub_backup_age_seconds{type="database"} $(( $(date +%s) - $(stat -c %Y /var/backups/vendhub/vendhub_db_*.sql.gz | tail -n1) ))
EOF
```

## Best Practices

### 1. Test Restores Regularly

```bash
# Monthly restore test (to separate test database)
DATABASE_NAME=vendhub_restore_test ./restore-database.sh /var/backups/vendhub/latest_backup.sql.gz
```

### 2. Off-site Backup Copy

```bash
# Sync to S3/R2 for off-site storage
aws s3 sync /var/backups/vendhub/ s3://vendhub-backups/$(hostname)/

# Or use rsync to remote server
rsync -avz /var/backups/vendhub/ backup-server:/backups/vendhub/
```

### 3. Encryption

```bash
# Encrypt backups before off-site transfer
gpg --encrypt --recipient admin@vendhub.com /var/backups/vendhub/vendhub_db_*.sql.gz
```

### 4. Documentation

- Keep this document updated
- Document any restore procedures you perform
- Maintain a runbook for disaster recovery
- Document RTO (Recovery Time Objective) and RPO (Recovery Point Objective)

### 5. Security

```bash
# Secure backup directory
chmod 700 /var/backups/vendhub
chown root:root /var/backups/vendhub

# Restrict script permissions
chmod 700 /opt/vendhub/scripts/backup/*.sh
```

## Troubleshooting

### Issue: Backup file too large

**Solution:** Increase compression or implement incremental backups

```bash
# Use higher compression
pg_dump --format=custom --compress=9 ...

# Or implement WAL archiving for incremental backups
```

### Issue: Backup taking too long

**Solution:** Run backups during low-traffic periods or use streaming backups

```bash
# Use pg_basebackup for streaming backups
pg_basebackup -D /var/backups/vendhub/base -Ft -z -P
```

### Issue: Restore fails due to version mismatch

**Solution:** Ensure PostgreSQL client version matches server version

```bash
pg_dump --version
psql --version
```

## Recovery Metrics

### RTO (Recovery Time Objective)

- **Database restore**: ~15 minutes (for 10GB database)
- **Redis restore**: ~2 minutes
- **MinIO restore**: ~30 minutes (depends on file count)
- **Full system**: ~1 hour

### RPO (Recovery Point Objective)

- **Daily backups**: Maximum 24 hours data loss
- **For critical data**: Consider setting up streaming replication

## Support

For backup and restore support:
- Email: admin@vendhub.com
- Documentation: https://docs.vendhub.com/backup-restore
- Emergency: +998 XX XXX XX XX

---

Last Updated: 2025-01-15
Version: 1.0
