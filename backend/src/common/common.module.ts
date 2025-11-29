import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitConversionService } from './services/unit-conversion.service';
import { IsDictionaryCodeConstraint } from './validators';
import { DictionaryItem } from '@modules/dictionaries/entities/dictionary-item.entity';
import { MoneyHelper } from './helpers/money.helper';
import { RedisCacheModule } from './cache/redis-cache.module';
import { RedisCacheService } from './cache/redis-cache.service';

/**
 * Global Common Module
 *
 * Provides shared services and validators available throughout the application:
 * - UnitConversionService: For converting units (kg/g, L/ml, etc.)
 * - IsDictionaryCodeConstraint: Custom validator for dictionary codes
 * - MoneyHelper: For formatting and parsing UZS currency amounts
 * - RedisCacheService: For distributed caching with Redis
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DictionaryItem]), RedisCacheModule],
  providers: [UnitConversionService, IsDictionaryCodeConstraint, MoneyHelper, RedisCacheService],
  exports: [
    UnitConversionService,
    IsDictionaryCodeConstraint,
    MoneyHelper,
    RedisCacheService,
    RedisCacheModule,
  ],
})
export class CommonModule {}
