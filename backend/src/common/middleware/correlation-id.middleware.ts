import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

// Extend Express Request type to include correlationId
declare module 'express' {
  interface Request {
    correlationId?: string;
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) || uuidv4();

    // Store in request for logging
    req.correlationId = correlationId;

    // Return in response header
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
