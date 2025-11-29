import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessRequestsService } from './access-requests.service';
import { AccessRequestsController } from './access-requests.controller';
import { AccessRequest } from './entities/access-request.entity';
import { UsersModule } from '@modules/users/users.module';
import { RbacModule } from '@modules/rbac/rbac.module';

/**
 * Access Requests Module
 *
 * Manages access requests for new users via Telegram and other sources
 * Implements REQ-AUTH-32 and REQ-AUTH-33
 */
@Module({
  imports: [TypeOrmModule.forFeature([AccessRequest]), UsersModule, RbacModule],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
  exports: [AccessRequestsService],
})
export class AccessRequestsModule {}
