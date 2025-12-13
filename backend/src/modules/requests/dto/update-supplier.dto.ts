import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';

/**
 * DTO для обновления поставщика.
 */
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
