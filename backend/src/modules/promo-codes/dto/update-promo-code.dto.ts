import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromoCodeDto } from './create-promo-code.dto';

export class UpdatePromoCodeDto extends PartialType(
  OmitType(CreatePromoCodeDto, ['code'] as const),
) {}
