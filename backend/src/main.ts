import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { useContainer } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { createWinstonLogger } from './common/logger/winston.config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  // Initialize Sentry
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  // Create app with Winston logger
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),
  });

  const logger = new Logger('Bootstrap');

  // Enable class-validator to use NestJS DI container
  // This is required for custom validators like IsDictionaryCodeConstraint
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // SEC-1: Cookie parser for httpOnly cookie-based authentication
  app.use(cookieParser());

  // PERF-1: Gzip compression for API responses
  // Reduces bandwidth usage and improves response times
  app.use(
    compression({
      // Skip compression if client sends x-no-compression header
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use default filter (compresses based on content-type)
        return compression.filter(req, res);
      },
      // Only compress responses larger than 1KB
      threshold: 1024,
      // Compression level (1-9, default 6)
      // Higher = better compression but more CPU
      level: 6,
    }),
  );


  // SEC-2: Security headers via Helmet
  // Comprehensive security headers configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3001';
  const minioOrigin = process.env.MINIO_ENDPOINT
    ? `https://${process.env.MINIO_ENDPOINT}`
    : 'http://localhost:9000';

  app.use(
    helmet({
      // Content Security Policy - controls which resources can be loaded
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'", frontendOrigin, minioOrigin, 'wss:', 'ws:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },

      // HSTS - Strict Transport Security
      // Forces HTTPS for 1 year, includes subdomains
      strictTransportSecurity: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },

      // X-Frame-Options - prevent clickjacking
      frameguard: {
        action: 'deny',
      },

      // X-Content-Type-Options - prevent MIME type sniffing
      noSniff: true,

      // X-XSS-Protection - legacy XSS protection for older browsers
      xssFilter: true,

      // Referrer-Policy - control referrer information
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // X-DNS-Prefetch-Control - control DNS prefetching
      dnsPrefetchControl: {
        allow: false,
      },

      // X-Permitted-Cross-Domain-Policies
      permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // Cross-Origin-Embedder-Policy - disabled for compatibility with external resources
      crossOriginEmbedderPolicy: false,

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: {
        policy: 'same-origin',
      },

      // Origin-Agent-Cluster header
      originAgentCluster: true,
    }),
  );

  // SEC-3: Permissions-Policy header (not included in Helmet)
  // Controls browser features the application can use
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );
    next();
  });

  logger.log(`Security headers configured for ${isProduction ? 'production' : 'development'} environment`);

  // Global exception filter
  // Register SentryExceptionFilter first to capture all exceptions
  // Then HttpExceptionFilter to format responses
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration
  // Note: isProduction and frontendOrigin already defined above for security headers
  const frontendUrl = process.env.FRONTEND_URL;

  // In production, warn if FRONTEND_URL is not set but don't fail
  if (isProduction && !frontendUrl) {
    logger.warn(
      'FRONTEND_URL is not set in production environment. ' +
      'CORS will be configured with restrictive defaults. ' +
      'To enable specific origins, please set FRONTEND_URL in your .env file.',
    );
  }

  // Configure CORS based on environment
  let corsOptions: CorsOptions;

  if (frontendUrl) {
    // If FRONTEND_URL is provided, use it for CORS
    corsOptions = {
      origin: frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
    };
  } else if (isProduction) {
    // Production without FRONTEND_URL: use restrictive CORS
    corsOptions = {
      origin: false, // Disable CORS (only same-origin requests allowed)
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
    };
    logger.log('CORS is disabled. Only same-origin requests are allowed.');
  } else {
    // Development: allow localhost
    corsOptions = {
      origin: 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
    };
  }

  app.enableCors(corsOptions);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix - exclude health endpoints for Railway health checks
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready', 'health/live', 'health/queues', 'metrics'],
  });

  // Swagger documentation
  logger.log('Configuring Swagger documentation...');
  const config = new DocumentBuilder()
    .setTitle('VendHub Manager API')
    .setDescription('API documentation for VendHub Manager - Vending Machine Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  logger.debug('Creating Swagger document...');
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('Swagger setup complete');

  const port = process.env.PORT || 3000;
  logger.log(`Starting server on port ${port}...`);
  await app.listen(port, '0.0.0.0');

  logger.log(`VendHub Manager API running on port ${port}`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
}

void bootstrap();
