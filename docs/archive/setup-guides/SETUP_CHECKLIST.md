# VH-M24 24/7 Production Setup Checklist

## Phase 1: Supabase Setup

### Create Project
- [ ] Sign up at https://supabase.com
- [ ] Create new project "vendhub-production"
- [ ] Select region closest to users
- [ ] Generate strong database password
- [ ] Wait for project initialization (2-3 minutes)

### Configure Database
- [ ] Copy connection string
- [ ] Set DATABASE_URL environment variable
- [ ] Run migrations: `pnpm db:push`
- [ ] Verify tables created: `pnpm db:studio`
- [ ] Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### Configure Backups
- [ ] Go to **Settings** → **Backups**
- [ ] Enable **Automated Backups**
- [ ] Set frequency: **Daily**
- [ ] Set retention: **30 days**
- [ ] Enable **Point-in-Time Recovery** (PITR)
- [ ] Copy **Pooling Connection String**

### Configure Connection Pooling
- [ ] Enable **Connection Pooling**
- [ ] Set mode: **Transaction**
- [ ] Set pool size: **25**
- [ ] Update DATABASE_URL to pooling string

### Security
- [ ] Enable SSL connections
- [ ] Set up IP whitelist (if needed)
- [ ] Configure Row Level Security (RLS)
- [ ] Enable audit logging

## Phase 2: Railway Setup

### Create Account
- [ ] Sign up at https://railway.app
- [ ] Connect GitHub account
- [ ] Authorize Railway access

### Create Project
- [ ] Click **New Project**
- [ ] Select **Deploy from GitHub repo**
- [ ] Select **jamsmac/VHM24**
- [ ] Click **Deploy**
- [ ] Wait for initial build (5-10 minutes)

### Configure Environment Variables
- [ ] Add `NODE_ENV=production`
- [ ] Add `DATABASE_URL=<Supabase Connection String>`
- [ ] Add `JWT_SECRET=<Generate strong secret>`
- [ ] Add `ANTHROPIC_API_KEY=<Your API key>`
- [ ] Add `TELEGRAM_BOT_TOKEN=<Your bot token>`
- [ ] Add `TELEGRAM_OWNER_ID=<Your ID>`
- [ ] Add `VITE_APP_TITLE=VendHub Manager`
- [ ] Add `VITE_APP_LOGO=<Your logo URL>`

### Configure Build Settings
- [ ] Set **Build Command:** `pnpm install && pnpm build`
- [ ] Set **Start Command:** `pnpm start`
- [ ] Set **Port:** `3000`
- [ ] Verify build succeeds

### Configure Health Check
- [ ] Enable **Health Check**
- [ ] Set **Path:** `/api/health/check`
- [ ] Set **Interval:** `30 seconds`
- [ ] Set **Timeout:** `10 seconds`
- [ ] Verify health check passes

### Configure Auto-Scaling
- [ ] Enable **Auto-scaling**
- [ ] Set **Min replicas:** `2`
- [ ] Set **Max replicas:** `5`
- [ ] Set **CPU threshold:** `70%`
- [ ] Set **Memory threshold:** `80%`

### Configure Custom Domain
- [ ] Go to **Settings** → **Domain**
- [ ] Add custom domain: `vendhub.yourdomain.com`
- [ ] Add DNS records (Railway provides)
- [ ] Enable **Auto SSL certificate**
- [ ] Wait for SSL certificate (5-10 minutes)
- [ ] Test HTTPS connection

### Configure Monitoring
- [ ] Go to **Monitoring** tab
- [ ] Enable **Metrics**
- [ ] Set up alerts:
  - [ ] CPU > 80%
  - [ ] Memory > 85%
  - [ ] Error rate > 5%
  - [ ] Response time > 5s

## Phase 3: Monitoring & Alerting

### Railway Monitoring
- [ ] View **Metrics** dashboard
- [ ] View **Logs** in real-time
- [ ] Configure **Alerts**
- [ ] Set up **Slack integration** (optional)
- [ ] Set up **Email notifications**

### Supabase Monitoring
- [ ] View **Database Metrics**
- [ ] Configure **Alerts**
- [ ] Set up **Backup notifications**
- [ ] Enable **Query performance insights**

### Health Check Endpoints
- [ ] Test `/api/health/check`
- [ ] Test `/api/health/ready`
- [ ] Test `/api/health/live`
- [ ] Verify responses are correct

### Uptime Monitoring (Optional)
- [ ] Sign up at https://uptimerobot.com
- [ ] Create monitor for `https://vendhub.yourdomain.com/api/health/check`
- [ ] Set check interval to 5 minutes
- [ ] Configure alert contacts

## Phase 4: Backup & Recovery

### Supabase Backups
- [ ] Verify daily backup schedule
- [ ] Check last backup timestamp
- [ ] Test backup restore procedure
- [ ] Verify PITR is working
- [ ] Document backup location

### Application Backups
- [ ] Create backup script
- [ ] Schedule daily exports: `0 3 * * * cd /app && pnpm db:export > backups/daily-$(date +\%Y-\%m-\%d).json`
- [ ] Store backups securely
- [ ] Test restore procedure
- [ ] Document restore steps

### Disaster Recovery Plan
- [ ] Document RTO (Recovery Time Objective)
- [ ] Document RPO (Recovery Point Objective)
- [ ] Create incident response procedures
- [ ] Schedule monthly DR drill
- [ ] Train team on recovery

## Phase 5: Security

### SSL/TLS
- [ ] Enable HTTPS on Railway
- [ ] Verify SSL certificate is valid
- [ ] Set up automatic renewal
- [ ] Test SSL configuration

### Database Security
- [ ] Enable SSL connections to database
- [ ] Configure IP whitelist
- [ ] Set up Row Level Security (RLS)
- [ ] Enable audit logging
- [ ] Rotate database password

### API Security
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable request validation
- [ ] Configure JWT properly
- [ ] Set up API key management

### Secrets Management
- [ ] Store all secrets in Railway environment
- [ ] Never commit secrets to git
- [ ] Rotate secrets regularly
- [ ] Use strong passwords
- [ ] Document secret rotation procedure

## Phase 6: Performance Optimization

### Database Optimization
- [ ] Create indexes on frequently queried columns
- [ ] Analyze query performance
- [ ] Enable query caching
- [ ] Archive old data
- [ ] Set up connection pooling

### Application Optimization
- [ ] Enable gzip compression
- [ ] Optimize asset delivery
- [ ] Set up CDN (optional)
- [ ] Enable caching headers
- [ ] Optimize database queries

### Monitoring Performance
- [ ] Track response times
- [ ] Monitor error rates
- [ ] Track database query performance
- [ ] Monitor resource usage
- [ ] Set performance baselines

## Phase 7: Documentation

### Create Documentation
- [ ] PRODUCTION_SETUP.md - ✅ Created
- [ ] MONITORING_SETUP.md - ✅ Created
- [ ] BACKUP_RECOVERY.md - ✅ Created
- [ ] OPERATIONS_RUNBOOK.md - ✅ Created
- [ ] SETUP_CHECKLIST.md - ✅ Created (this file)

### Team Training
- [ ] Train team on monitoring
- [ ] Train team on incident response
- [ ] Train team on backup/recovery
- [ ] Train team on deployment
- [ ] Document on-call procedures

### Keep Updated
- [ ] Review documentation monthly
- [ ] Update based on incidents
- [ ] Update based on changes
- [ ] Version control documentation
- [ ] Archive old versions

## Phase 8: Testing

### Functionality Testing
- [ ] Test all API endpoints
- [ ] Test user authentication
- [ ] Test data operations
- [ ] Test file uploads
- [ ] Test integrations

### Load Testing
- [ ] Simulate 100 concurrent users
- [ ] Simulate 1000 concurrent users
- [ ] Check response times
- [ ] Check error rates
- [ ] Verify auto-scaling works

### Disaster Recovery Testing
- [ ] Test database backup restore
- [ ] Test application rollback
- [ ] Test failover procedures
- [ ] Test recovery time
- [ ] Document results

### Security Testing
- [ ] Run security scan
- [ ] Test SQL injection protection
- [ ] Test XSS protection
- [ ] Test CSRF protection
- [ ] Test authentication

## Phase 9: Deployment

### Pre-Deployment
- [ ] Review all changes
- [ ] Run tests: `pnpm test`
- [ ] Check linting: `pnpm lint`
- [ ] Verify build: `pnpm build`
- [ ] Create backup

### Deployment
- [ ] Push to main branch
- [ ] Monitor deployment in Railway
- [ ] Verify health checks pass
- [ ] Test application
- [ ] Monitor metrics

### Post-Deployment
- [ ] Check error logs
- [ ] Verify all features working
- [ ] Monitor performance
- [ ] Check for issues
- [ ] Update documentation

## Phase 10: Go-Live

### Pre-Launch
- [ ] All tests passing ✅
- [ ] Documentation complete ✅
- [ ] Monitoring configured ✅
- [ ] Backups working ✅
- [ ] Team trained ✅
- [ ] Runbook ready ✅

### Launch
- [ ] Update DNS to point to Railway
- [ ] Verify domain resolution
- [ ] Test application from public internet
- [ ] Monitor for issues
- [ ] Be ready to rollback

### Post-Launch
- [ ] Monitor metrics closely
- [ ] Check error logs regularly
- [ ] Respond quickly to issues
- [ ] Document any problems
- [ ] Plan improvements

## Phase 11: Ongoing Operations

### Daily Tasks
- [ ] Check application status
- [ ] Review error logs
- [ ] Verify backup completed
- [ ] Monitor metrics
- [ ] Respond to alerts

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check for slow queries
- [ ] Review security logs
- [ ] Plan maintenance
- [ ] Update documentation

### Monthly Tasks
- [ ] Test backup restore
- [ ] Run disaster recovery drill
- [ ] Review incidents
- [ ] Plan improvements
- [ ] Update runbook

### Quarterly Tasks
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Update dependencies
- [ ] Review SLAs

## Verification Checklist

### Before Going Live

- [ ] Application deployed to Railway
- [ ] Database running on Supabase
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups working
- [ ] SSL certificate valid
- [ ] Domain resolving
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team trained
- [ ] Incident procedures ready
- [ ] On-call rotation set up

### After Going Live

- [ ] Monitor metrics for 24 hours
- [ ] Check error logs
- [ ] Verify backups
- [ ] Test recovery procedures
- [ ] Gather feedback
- [ ] Document issues
- [ ] Plan improvements

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Node.js Docs:** https://nodejs.org/docs

---

**Last Updated:** 2025-11-29  
**Status:** Ready for Setup  
**Estimated Setup Time:** 4-6 hours  
**Estimated Go-Live:** 1-2 days
