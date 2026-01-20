'use client';

/**
 * DirectorySelect Component
 *
 * An autocomplete dropdown for selecting entries from a directory.
 * Supports search, recent selections, and inline entry creation.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Plus, Shield, Pencil, Loader2, X, ChevronDown } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { useLocalized } from '../../hooks/useLocalized';
import { useDirectory } from '../../hooks/useDirectory';
import type { DirectoryEntry, EntryOrigin } from '../../types';
import { InlineCreateModal } from '../InlineCreate/InlineCreateModal';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface DirectorySelectProps {
  /** Directory ID to select from */
  directoryId: string;
  /** Currently selected entry ID */
  value?: string | null;
  /** Callback when selection changes */
  onChange: (entryId: string | null, entry?: DirectoryEntry) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Allow clearing the selection */
  clearable?: boolean;
  /** Show origin badge */
  showOrigin?: boolean;
  /** Allow inline creation */
  allowCreate?: boolean;
}

export function DirectorySelect({
  directoryId,
  value,
  onChange,
  placeholder = 'Выберите...',
  disabled = false,
  className,
  clearable = true,
  showOrigin = true,
  allowCreate = true,
}: DirectorySelectProps) {
  const [open, setOpen] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: directory } = useDirectory(directoryId);
  const {
    query,
    setQuery,
    results,
    recent,
    isLoading,
  } = useSearch({
    directoryId,
    includeRecent: true,
  });

  // Track selected entry for display
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);
  const selectedName = useLocalized(selectedEntry);

  // Load selected entry from results when value changes
  useEffect(() => {
    if (value) {
      const entry = [...results, ...recent].find((e) => e.id === value);
      if (entry) {
        setSelectedEntry(entry);
      }
    } else {
      setSelectedEntry(null);
    }
  }, [value, results, recent]);

  const handleSelect = useCallback(
    (entry: DirectoryEntry) => {
      setSelectedEntry(entry);
      onChange(entry.id, entry);
      setOpen(false);
      setQuery('');
    },
    [onChange, setQuery],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedEntry(null);
      onChange(null);
      setQuery('');
    },
    [onChange, setQuery],
  );

  const handleInlineCreate = useCallback(
    (entry: DirectoryEntry) => {
      handleSelect(entry);
      setShowInlineCreate(false);
    },
    [handleSelect],
  );

  const canInlineCreate =
    allowCreate && (directory?.settings?.allow_inline_create ?? true);
  const showCreateOption =
    canInlineCreate && query.length > 0 && results.length === 0;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedEntry && 'text-muted-foreground',
              className,
            )}
          >
            {selectedEntry ? (
              <span className="flex items-center gap-2 truncate">
                {showOrigin && <OriginBadge origin={selectedEntry.origin} />}
                <span className="truncate">{selectedName}</span>
                {selectedEntry.code && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedEntry.code})
                  </span>
                )}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
            <div className="flex items-center gap-1">
              {clearable && selectedEntry && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[400px] p-0" align="start">
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              className="h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {/* Recent selections */}
            {recent.length > 0 && !query && (
              <div className="p-2">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Недавние
                </div>
                {recent.map((entry) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    isSelected={entry.id === value}
                    showOrigin={showOrigin}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <div className="p-2">
                {query && (
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Результаты поиска
                  </div>
                )}
                {results.map((entry) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    isSelected={entry.id === value}
                    showOrigin={showOrigin}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* No results */}
            {!isLoading && query && results.length === 0 && !showCreateOption && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </div>
            )}

            {/* Empty state with no query */}
            {!isLoading && !query && results.length === 0 && recent.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Начните вводить для поиска
              </div>
            )}

            {/* Inline create option */}
            {showCreateOption && (
              <div className="border-t p-2">
                <button
                  type="button"
                  onClick={() => setShowInlineCreate(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span>
                    Добавить «<strong>{query}</strong>» в справочник
                  </span>
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline Create Modal */}
      {showInlineCreate && directory && (
        <InlineCreateModal
          directory={directory}
          initialName={query}
          onCreated={handleInlineCreate}
          onClose={() => setShowInlineCreate(false)}
        />
      )}
    </>
  );
}

// Entry item component
interface EntryItemProps {
  entry: DirectoryEntry;
  isSelected: boolean;
  showOrigin: boolean;
  onSelect: (entry: DirectoryEntry) => void;
}

function EntryItem({ entry, isSelected, showOrigin, onSelect }: EntryItemProps) {
  const name = useLocalized(entry);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
        isSelected && 'bg-accent',
      )}
    >
      {showOrigin && <OriginBadge origin={entry.origin} />}
      <span className="flex-1 truncate text-left">{name}</span>
      {entry.code && (
        <span className="text-xs text-muted-foreground">{entry.code}</span>
      )}
    </button>
  );
}

// Origin badge component
function OriginBadge({ origin }: { origin: EntryOrigin }) {
  if (origin === 'official') {
    return (
      <Badge variant="secondary" className="h-5 px-1" title="Официальный">
        <Shield className="h-3 w-3" />
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="h-5 px-1" title="Локальный">
      <Pencil className="h-3 w-3" />
    </Badge>
  );
}

export default DirectorySelect;
