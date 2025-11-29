import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TelegramBotService } from './telegram-bot.service';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { Contract } from '../counterparty/entities/contract.entity';
import { CommissionCalculation } from '../counterparty/entities/commission-calculation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Task, Contract, CommissionCalculation]),
    BullModule.registerQueue({
      name: 'commission-calculations',
    }),
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
