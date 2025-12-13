import { PartialType } from '@nestjs/swagger';
import { CreateMaterialDto } from './create-material.dto';

/**
 * DTO для обновления материала.
 */
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
