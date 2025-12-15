import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { validate } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DictionariesModule } from './modules/dictionaries/dictionaries.module';
import { LocationsModule } from './modules/locations/locations.module';
import { MachinesModule } from './modules/machines/machines.module';
import { NomenclatureModule } from './modules/nomenclature/nomenclature.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { FilesModule } from './modules/files/files.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { OperatorRatingsModule } from './modules/operator-ratings/operator-ratings.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RoutesModule } from './modules/routes/routes.module';
import { BillingModule } from './modules/billing/billing.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AccessRequestsModule } from './modules/access-requests/access-requests.module';
// import { AuditLogModule } from './modules/audit-logs/audit-log.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { HrModule } from './modules/hr/hr.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { SecurityModule } from './modules/security/security.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { WebPushModule } from './modules/web-push/web-push.module';
import { SalesImportModule } from './modules/sales-import/sales-import.module';
import { CounterpartyModule } from './modules/counterparty/counterparty.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { OpeningBalancesModule } from './modules/opening-balances/opening-balances.module';
import { PurchaseHistoryModule } from './modules/purchase-history/purchase-history.module';
import { IntelligentImportModule } from './modules/intelligent-import/intelligent-import.module';
import { BullBoardModule } from './modules/bull-board/bull-board.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { HealthModule } from './health/health.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate, // Validate env variables on startup
    }),

    // Common services (UnitConversionService, etc.)
    CommonModule,

    // Database with connection pool
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // NEVER use synchronize in production - always use migrations
        synchronize:
          configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true' &&
          configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
        // Connection pool configuration for better performance under load
        extra: {
          max: parseInt(configService.get('DB_POOL_MAX', '20')), // Maximum connections
          min: parseInt(configService.get('DB_POOL_MIN', '5')), // Minimum connections
          idleTimeoutMillis: 30000, // Close idle connections after 30s
          connectionTimeoutMillis: 2000, // Wait max 2s for connection
        },
      }),
      inject: [ConfigService],
    }),

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // Event emitter for analytics and other events
    EventEmitterModule.forRoot(),

    // Bull queue for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting with Redis storage for distributed rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get('THROTTLE_TTL', 60000), // 1 minute default
          limit: configService.get('THROTTLE_LIMIT', 100), // 100 requests per ttl
        },
        {
          name: 'short',
          ttl: 1000, // 1 second
          limit: 3, // 3 requests per second
        },
        {
          name: 'medium',
          ttl: 10000, // 10 seconds
          limit: 20, // 20 requests per 10 seconds
        },
        {
          name: 'long',
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ],
      inject: [ConfigService],
    }),

    // Application modules
    UsersModule,
    AuthModule,
    DictionariesModule,
    LocationsModule,
    MachinesModule,
    NomenclatureModule,
    RecipesModule,
    FilesModule,
    TasksModule,
    OperatorRatingsModule,
    InventoryModule,
    NotificationsModule,
    TransactionsModule,
    IncidentsModule,
    ComplaintsModule,
    EquipmentModule,
    TelegramModule,
    AnalyticsModule,
    RoutesModule,
    BillingModule,
    CounterpartyModule, // Full module with counterparties, contracts, and commissions
    OpeningBalancesModule, // Stock opening balances management
    PurchaseHistoryModule, // Purchase history tracking
    IntelligentImportModule, // Intelligent data import with AI assistance
    RbacModule,
    AccessRequestsModule,
    //     AuditLogModule,
    WarehouseModule,
    HrModule,
    IntegrationModule,
    SecurityModule,
    ReportsModule,
    // TelegramBotModule, // Removed - functionality merged into TelegramModule
    WebPushModule,
    SalesImportModule,
    RequestsModule,
    ReconciliationModule,
    BullBoardModule,
    WebsocketModule,
    HealthModule,
    ScheduledTasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
