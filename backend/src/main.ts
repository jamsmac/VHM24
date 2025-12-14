import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // SEC-1: Cookie parser for httpOnly cookie-based authentication
  app.use(cookieParser());

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, warn if FRONTEND_URL is not set but don't fail
  if (isProduction && !frontendUrl) {
    console.warn(
      '⚠️  WARNING: FRONTEND_URL is not set in production environment.\n' +
        '   CORS will be configured with restrictive defaults.\n' +
        '   To enable specific origins, please set FRONTEND_URL in your .env file.',
    );
  }

  // Configure CORS based on environment
  let corsOptions: any;

  if (frontendUrl) {
    // If FRONTEND_URL is provided, use it for CORS
    corsOptions = {
      origin: frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  } else if (isProduction) {
    // Production without FRONTEND_URL: use restrictive CORS
    corsOptions = {
      origin: false, // Disable CORS (only same-origin requests allowed)
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    console.log('📛 CORS is disabled. Only same-origin requests are allowed.');
  } else {
    // Development: allow localhost
    corsOptions = {
      origin: 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
    exclude: ['health', 'health/ready', 'health/live', 'health/queues'],
  });

  // Swagger documentation
  console.log('📝 Configuring Swagger documentation...');
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

  console.log('📝 Creating Swagger document...');
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  console.log('📝 Swagger setup complete.');

  const port = process.env.PORT || 3000;
  console.log(`🔌 Starting server on port ${port}...`);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 VendHub Manager API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
