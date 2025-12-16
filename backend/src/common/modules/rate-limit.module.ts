import { Module } from '@nestjs/common';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@Module({
  providers: [
    RateLimiterService,
    RateLimitGuard,
  ],
  exports: [
    RateLimiterService,
    RateLimitGuard,
  ],
})
export class RateLimitModule {}
