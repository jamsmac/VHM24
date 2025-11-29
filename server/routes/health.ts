import { router, publicProcedure } from '../trpc';
import { getDb } from '../db';

export const healthRouter = router({
  check: publicProcedure.query(async () => {
    try {
      // Check database connection
      const db = await getDb();
      const result = await db.query.users.findFirst();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: !!result || result === null,
          status: 'ok',
        },
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || 'unknown',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || 'unknown',
      };
    }
  }),

  ready: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      await db.query.users.findFirst();

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        ready: false,
        timestamp: new Date().toISOString(),
      };
    }
  }),

  live: publicProcedure.query(() => {
    return {
      live: true,
      timestamp: new Date().toISOString(),
    };
  }),
});
