import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipeSnapshotHelper } from './recipes-snapshot.helper';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeSnapshot } from './entities/recipe-snapshot.entity';
import { NomenclatureModule } from '../nomenclature/nomenclature.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeSnapshot]),
    NomenclatureModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService, RecipeSnapshotHelper],
  exports: [RecipesService, RecipeSnapshotHelper],
})
export class RecipesModule {}
