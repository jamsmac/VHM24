import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController } from './complaints.controller';
import { Complaint } from './entities/complaint.entity';
import { MachinesModule } from '../machines/machines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Complaint]),
    MachinesModule, // For resolving QR codes to machines
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
