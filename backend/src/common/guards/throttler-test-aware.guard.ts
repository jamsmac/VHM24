import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom ThrottlerGuard that skips rate limiting in test environment.
 * Used globally to allow E2E tests to run without 429 errors.
 */
@Injectable()
export class ThrottlerTestAwareGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    return super.canActivate(context);
  }
}
