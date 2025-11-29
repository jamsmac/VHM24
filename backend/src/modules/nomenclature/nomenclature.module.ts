import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NomenclatureService } from './nomenclature.service';
import { NomenclatureController } from './nomenclature.controller';
import { Nomenclature } from './entities/nomenclature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nomenclature])],
  controllers: [NomenclatureController],
  providers: [NomenclatureService],
  exports: [NomenclatureService],
})
export class NomenclatureModule {}
