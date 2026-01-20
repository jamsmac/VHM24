/**
 * Directory System Feature
 *
 * A comprehensive directory/reference data management system for VendHub Manager.
 *
 * Features:
 * - Flexible field definitions with 16 field types
 * - External data sources with auto-sync
 * - Origin tracking (OFFICIAL vs LOCAL)
 * - Templates for quick setup
 * - File attachments
 * - Hierarchical entries
 * - Audit trail
 * - Entry versioning and deprecation
 * - Full-text and fuzzy search
 * - Approval workflows
 * - Offline support with sync queue
 *
 * Usage:
 * ```tsx
 * import { DirectorySelect, EntryList, useDirectory, useEntries } from '@/features/directories';
 *
 * // Select component for forms
 * <DirectorySelect
 *   directoryId="products"
 *   value={productId}
 *   onChange={(id, entry) => setProductId(id)}
 * />
 *
 * // Entry list for management
 * <EntryList
 *   directoryId="products"
 *   onEdit={(entry) => openEditModal(entry)}
 * />
 *
 * // Hooks for custom components
 * const { data: directory } = useDirectory('products');
 * const { data: entries } = useEntries({ directoryId: 'products' });
 * ```
 */

// Types
export * from './types';

// API
export * from './api';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Store
export * from './store';
