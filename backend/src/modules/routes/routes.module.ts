import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { RouteOptimizationService } from './services/route-optimization.service';

@Module({
  imports: [TypeOrmModule.forFeature([Route, RouteStop])],
  providers: [RouteOptimizationService],
  exports: [RouteOptimizationService],
})
export class RoutesModule {}
