import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateContainerDto } from './create-container.dto';

/**
 * DTO for updating an existing container
 *
 * Extends CreateContainerDto but makes all fields optional
 * and excludes machine_id (cannot change the machine association)
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
export class UpdateContainerDto extends PartialType(
  OmitType(CreateContainerDto, ['machine_id'] as const),
) {}
