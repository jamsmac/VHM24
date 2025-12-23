import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard error response DTO for API error documentation
 *
 * Used with @ApiResponse decorators to document error responses in Swagger
 *
 * @example
 * @ApiResponse({
 *   status: 400,
 *   description: 'Bad Request',
 *   type: ErrorResponseDto,
 * })
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'ISO timestamp of when the error occurred',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/v1/machines',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used',
    example: 'POST',
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
  method: string;

  @ApiProperty({
    description: 'Error message or array of validation messages',
    oneOf: [
      { type: 'string', example: 'Machine not found' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['name must be a string', 'email must be a valid email'],
      },
    ],
  })
  message: string | string[];

  @ApiPropertyOptional({
    description: 'Error type/class name',
    example: 'BadRequestException',
  })
  error?: string;
}

/**
 * Validation error response DTO for 400 Bad Request with validation errors
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code for validation errors',
    example: 400,
    default: 400,
  })
  statusCode: 400;

  @ApiProperty({
    description: 'Array of validation error messages',
    type: [String],
    example: ['name must be a string', 'email must be a valid email'],
  })
  message: string[];

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
    default: 'Bad Request',
  })
  error: string;
}

/**
 * Unauthorized error response DTO for 401 Unauthorized
 */
export class UnauthorizedErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code for unauthorized access',
    example: 401,
    default: 401,
  })
  statusCode: 401;

  @ApiProperty({
    description: 'Unauthorized error message',
    example: 'Unauthorized',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Unauthorized',
    default: 'Unauthorized',
  })
  error: string;
}

/**
 * Forbidden error response DTO for 403 Forbidden
 */
export class ForbiddenErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code for forbidden access',
    example: 403,
    default: 403,
  })
  statusCode: 403;

  @ApiProperty({
    description: 'Forbidden error message',
    example: 'Access denied. Insufficient permissions.',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Forbidden',
    default: 'Forbidden',
  })
  error: string;
}

/**
 * Not found error response DTO for 404 Not Found
 */
export class NotFoundErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code for not found resources',
    example: 404,
    default: 404,
  })
  statusCode: 404;

  @ApiProperty({
    description: 'Not found error message',
    example: 'Machine with ID 12345 not found',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Not Found',
    default: 'Not Found',
  })
  error: string;
}

/**
 * Internal server error response DTO for 500 Internal Server Error
 */
export class InternalServerErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code for server errors',
    example: 500,
    default: 500,
  })
  statusCode: 500;

  @ApiProperty({
    description: 'Server error message',
    example: 'Internal server error',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Internal Server Error',
    default: 'Internal Server Error',
  })
  error: string;
}
