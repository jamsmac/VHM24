/**
 * PM2 Ecosystem Configuration for VendHub
 *
 * This file configures:
 * 1. Main API server
 * 2. Commission calculation workers (BullMQ)
 * 3. Sales import workers (BullMQ)
 *
 * Usage:
 *   Development: pm2 start ecosystem.config.js --env development
 *   Production:  pm2 start ecosystem.config.js --env production
 *
 * Monitoring:
 *   pm2 list
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    /**
     * Main API Server
     * Handles HTTP requests, WebSocket connections
     */
    {
      name: 'vendhub-api',
      script: 'dist/main.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
    },

    /**
     * Commission Calculation Worker
     * Processes scheduled commission calculations (daily, weekly, monthly)
     */
    {
      name: 'commission-worker',
      script: 'dist/workers/commission.worker.js',
      instances: 2, // Run 2 worker instances for redundancy
      exec_mode: 'fork', // Workers should run in fork mode, not cluster
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'commission',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'commission',
      },
      error_file: './logs/commission-worker-error.log',
      out_file: './logs/commission-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      cron_restart: '0 0 * * *', // Restart daily at midnight to prevent memory leaks
    },

    /**
     * Sales Import Worker
     * Processes Excel file imports and sales data processing
     */
    {
      name: 'sales-import-worker',
      script: 'dist/workers/sales-import.worker.js',
      instances: 1, // Single instance sufficient for file processing
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Higher memory for Excel processing
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'sales-import',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'sales-import',
      },
      error_file: './logs/sales-import-worker-error.log',
      out_file: './logs/sales-import-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
    },

    /**
     * Job Scheduler (Cron Jobs)
     * Adds repeatable jobs to BullMQ queues
     * This is a lightweight process that only schedules jobs
     */
    {
      name: 'job-scheduler',
      script: 'dist/workers/job-scheduler.worker.js',
      instances: 1, // Only one scheduler needed
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'scheduler',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'scheduler',
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],

  /**
   * Deployment configuration (optional)
   * Use with pm2 deploy
   */
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/VendHub.git',
      path: '/var/www/vendhub',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
