import { PartialType } from '@nestjs/swagger';
import { CreateAlertRuleDto } from './create-alert-rule.dto';

/**
 * Update Alert Rule DTO
 * All fields are optional
 */
export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {}
