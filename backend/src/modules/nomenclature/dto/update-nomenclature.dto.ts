import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateNomenclatureDto } from './create-nomenclature.dto';

export class UpdateNomenclatureDto extends PartialType(
  OmitType(CreateNomenclatureDto, ['sku'] as const),
) {}
