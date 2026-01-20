import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDirectoryDto } from './create-directory.dto';

/**
 * DTO for updating an existing directory
 * All fields are optional, slug and type cannot be changed after creation
 */
export class UpdateDirectoryDto extends PartialType(
  OmitType(CreateDirectoryDto, ['slug', 'type'] as const),
) {}
