import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UsernameGeneratorService } from './services/username-generator.service';
import { PasswordGeneratorService } from './services/password-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsernameGeneratorService, PasswordGeneratorService],
  exports: [UsersService], // Export for use in Auth module
})
export class UsersModule {}
