import { PartialType } from '@nestjs/mapped-types';
import { CreateContractDto } from './create-contract.dto';

/**
 * DTO for updating an existing contract
 * All fields are optional (extends CreateContractDto with PartialType)
 */
export class UpdateContractDto extends PartialType(CreateContractDto) {}
