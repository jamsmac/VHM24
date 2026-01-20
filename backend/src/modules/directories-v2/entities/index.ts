/**
 * Directory System Entities
 *
 * This module provides a comprehensive directory/reference data management system.
 * It extends the simple dictionaries concept with:
 * - Flexible field definitions
 * - External data sources with auto-sync
 * - Origin tracking (OFFICIAL vs LOCAL)
 * - Templates for quick setup
 * - File attachments
 * - Hierarchical entries
 * - Audit trail
 * - Entry versioning and deprecation
 */

export * from './directory.entity';
export * from './directory-field.entity';
export * from './directory-entry.entity';
export * from './directory-source.entity';
export * from './directory-sync-log.entity';
export * from './directory-entry-file.entity';
export * from './directory-template.entity';
export * from './directory-entry-audit.entity';
export * from './directory-stats.entity';
