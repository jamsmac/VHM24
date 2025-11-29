import { PartialType } from '@nestjs/mapped-types';
import { CreateCounterpartyDto } from './create-counterparty.dto';

/**
 * DTO for updating an existing counterparty
 * All fields are optional (extends CreateCounterpartyDto with PartialType)
 */
export class UpdateCounterpartyDto extends PartialType(CreateCounterpartyDto) {}
