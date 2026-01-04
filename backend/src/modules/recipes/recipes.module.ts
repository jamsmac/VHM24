import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipeSnapshotHelper } from './recipes-snapshot.helper';
import { RecipeConsumptionService } from './services/recipe-consumption.service';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeSnapshot } from './entities/recipe-snapshot.entity';
import { NomenclatureModule } from '../nomenclature/nomenclature.module';
import { ContainersModule } from '../containers/containers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeSnapshot]),
    NomenclatureModule,
    ContainersModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService, RecipeSnapshotHelper, RecipeConsumptionService],
  exports: [RecipesService, RecipeSnapshotHelper, RecipeConsumptionService],
})
export class RecipesModule {}
