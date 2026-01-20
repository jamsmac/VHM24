'use client';

/**
 * EntryList Component
 *
 * A table view for displaying and managing directory entries.
 * Supports filtering, sorting, selection, and bulk actions.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield,
  Pencil,
  MoreHorizontal,
  Archive,
  Edit,
  Eye,
  Search,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { useEntries, useArchiveEntry, useRestoreEntry } from '../../hooks/useEntries';
import { useDirectory } from '../../hooks/useDirectory';
import { useLocalized, useLocalizedField } from '../../hooks/useLocalized';
import type {
  DirectoryEntry,
  EntryStatus,
  EntryOrigin,
  DirectoryField,
} from '../../types';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface EntryListProps {
  /** Directory ID */
  directoryId: string;
  /** Callback when editing an entry */
  onEdit?: (entry: DirectoryEntry) => void;
  /** Callback when viewing an entry */
  onView?: (entry: DirectoryEntry) => void;
  /** Show archived entries */
  showArchived?: boolean;
}

export function EntryList({
  directoryId,
  onEdit,
  onView,
  showArchived = false,
}: EntryListProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiveTarget, setArchiveTarget] = useState<DirectoryEntry | null>(null);

  const { data: directory, isLoading: isLoadingDirectory } = useDirectory(directoryId);
  const {
    data,
    isLoading: isLoadingEntries,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEntries({
    directoryId,
    status: showArchived ? undefined : ('active' as EntryStatus),
  });

  const archiveEntry = useArchiveEntry(directoryId);
  const restoreEntry = useRestoreEntry(directoryId);

  // Flatten pages
  const entries = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  // Filter by search
  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.name_ru.toLowerCase().includes(q) ||
        e.name_en?.toLowerCase().includes(q) ||
        e.code?.toLowerCase().includes(q),
    );
  }, [entries, search]);

  // Get visible columns from directory fields
  const visibleFields = useMemo(() => {
    return directory?.fields.filter((f) => f.show_in_table && f.is_active) || [];
  }, [directory]);

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [filteredEntries],
  );

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Archive handler
  const handleArchive = useCallback(async () => {
    if (!archiveTarget) return;

    try {
      await archiveEntry.mutateAsync(archiveTarget.id);
      setArchiveTarget(null);
    } catch (error) {
      console.error('Failed to archive entry:', error);
    }
  }, [archiveTarget, archiveEntry]);

  // Restore handler
  const handleRestore = useCallback(
    async (entry: DirectoryEntry) => {
      try {
        await restoreEntry.mutateAsync(entry.id);
      } catch (error) {
        console.error('Failed to restore entry:', error);
      }
    },
    [restoreEntry],
  );

  const isLoading = isLoadingDirectory || isLoadingEntries;

  if (isLoading && entries.length === 0) {
    return <EntryListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[300px] pl-8"
            />
          </div>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              Выбрано: {selectedIds.size}
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Действия</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Изменить категорию</DropdownMenuItem>
              <DropdownMenuItem>Добавить теги</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Archive className="mr-2 h-4 w-4" />
                Архивировать
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIds.size === filteredEntries.length &&
                    filteredEntries.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Происхождение</TableHead>
              {visibleFields.map((field) => (
                <FieldHeader key={field.id} field={field} />
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                visibleFields={visibleFields}
                selected={selectedIds.has(entry.id)}
                onSelect={(checked) => handleSelectOne(entry.id, checked)}
                onEdit={onEdit}
                onView={onView}
                onArchive={() => setArchiveTarget(entry)}
                onRestore={() => handleRestore(entry)}
              />
            ))}

            {filteredEntries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4 + visibleFields.length}
                  className="py-8 text-center"
                >
                  {search ? 'Ничего не найдено' : 'Записи отсутствуют'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Загрузка...
              </>
            ) : (
              'Загрузить ещё'
            )}
          </Button>
        </div>
      )}

      {/* Archive confirmation dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Архивировать запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Запись «{archiveTarget?.name_ru}» будет перемещена в архив. Вы сможете
              восстановить её позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Архивировать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Field header component
function FieldHeader({ field }: { field: DirectoryField }) {
  const label = useLocalizedField(field);
  return (
    <TableHead style={{ width: field.table_width || undefined }}>{label}</TableHead>
  );
}

// Entry row component
interface EntryRowProps {
  entry: DirectoryEntry;
  visibleFields: DirectoryField[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit?: (entry: DirectoryEntry) => void;
  onView?: (entry: DirectoryEntry) => void;
  onArchive: () => void;
  onRestore: () => void;
}

function EntryRow({
  entry,
  visibleFields,
  selected,
  onSelect,
  onEdit,
  onView,
  onArchive,
  onRestore,
}: EntryRowProps) {
  const name = useLocalized(entry);
  const isOfficial = entry.origin === 'official';
  const isArchived = entry.status === 'archived';
  const isDeprecated = !!entry.deprecated_at;

  return (
    <TableRow className={cn(isArchived && 'opacity-60', isDeprecated && 'bg-orange-50')}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(checked as boolean)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isOfficial ? (
            <Shield className="h-4 w-4 text-blue-500" title="Официальный" />
          ) : (
            <Pencil className="h-4 w-4 text-gray-400" title="Локальный" />
          )}
          <span className="truncate">{name}</span>
          {isDeprecated && (
            <Badge variant="outline" className="text-orange-500">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Устарел
            </Badge>
          )}
          {isArchived && (
            <Badge variant="secondary">
              <Archive className="mr-1 h-3 w-3" />
              Архив
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{entry.code || '—'}</TableCell>
      <TableCell>
        <Badge variant={isOfficial ? 'default' : 'secondary'}>
          {isOfficial ? 'Официальный' : 'Локальный'}
        </Badge>
      </TableCell>
      {visibleFields.map((field) => (
        <TableCell key={field.id}>
          <FieldValue value={entry.data[field.code]} field={field} />
        </TableCell>
      ))}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(entry)}>
              <Eye className="mr-2 h-4 w-4" />
              Просмотр
            </DropdownMenuItem>
            {!isOfficial && !isArchived && (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(entry)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArchive} className="text-destructive">
                  <Archive className="mr-2 h-4 w-4" />
                  Архивировать
                </DropdownMenuItem>
              </>
            )}
            {isArchived && (
              <DropdownMenuItem onClick={onRestore}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Восстановить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Field value renderer
function FieldValue({
  value,
  field,
}: {
  value: any;
  field: DirectoryField;
}): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (field.field_type) {
    case 'boolean':
      return value ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      );

    case 'number':
    case 'decimal':
      return typeof value === 'number' ? value.toLocaleString('ru-RU') : value;

    case 'date':
      return new Date(value).toLocaleDateString('ru-RU');

    case 'datetime':
      return new Date(value).toLocaleString('ru-RU');

    case 'select':
      if (field.options) {
        const option = field.options.find((o) => o.value === value);
        if (option) {
          return (
            <Badge
              variant="outline"
              style={{ backgroundColor: option.color || undefined }}
            >
              {option.label_ru}
            </Badge>
          );
        }
      }
      return String(value);

    case 'multiselect':
      if (Array.isArray(value) && field.options) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((v) => {
              const option = field.options?.find((o) => o.value === v);
              return (
                <Badge key={v} variant="outline" className="text-xs">
                  {option?.label_ru || v}
                </Badge>
              );
            })}
            {value.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{value.length - 3}
              </Badge>
            )}
          </div>
        );
      }
      return String(value);

    case 'url':
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {value.length > 30 ? `${value.substring(0, 30)}...` : value}
        </a>
      );

    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-blue-500 hover:underline">
          {value}
        </a>
      );

    default:
      return String(value).length > 50
        ? `${String(value).substring(0, 50)}...`
        : String(value);
  }
}

// Skeleton loader
function EntryListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-[300px]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default EntryList;
