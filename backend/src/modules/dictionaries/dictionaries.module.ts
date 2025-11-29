import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictionariesService } from './dictionaries.service';
import { DictionariesController } from './dictionaries.controller';
import { Dictionary } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { DictionaryCacheService } from './services/dictionary-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dictionary, DictionaryItem])],
  controllers: [DictionariesController],
  providers: [DictionariesService, DictionaryCacheService],
  exports: [DictionariesService, DictionaryCacheService],
})
export class DictionariesModule {}
