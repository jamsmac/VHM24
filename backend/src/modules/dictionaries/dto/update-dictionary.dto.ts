import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDictionaryDto } from './create-dictionary.dto';

export class UpdateDictionaryDto extends PartialType(
  OmitType(CreateDictionaryDto, ['code'] as const),
) {}
