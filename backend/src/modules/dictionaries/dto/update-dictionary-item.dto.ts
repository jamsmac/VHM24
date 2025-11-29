import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDictionaryItemDto } from './create-dictionary-item.dto';

export class UpdateDictionaryItemDto extends PartialType(
  OmitType(CreateDictionaryItemDto, ['code'] as const),
) {}
