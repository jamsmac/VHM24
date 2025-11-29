import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
@SkipThrottle() // Root endpoints should not be rate-limited
export class AppController {
  constructor(private readonly appService: AppService) {}

  // NOTE: /health endpoint is handled by HealthController with database checks

  @Get()
  @ApiOperation({ summary: 'API info' })
  getInfo() {
    return this.appService.getInfo();
  }
}
