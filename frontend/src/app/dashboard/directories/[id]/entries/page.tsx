'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirectory } from '@/features/directories/hooks';
import { EntryList } from '@/features/directories/components';

export default function DirectoryEntriesPage() {
  const params = useParams();
  const router = useRouter();
  const directoryId = params.id as string;

  const { data: directory, isLoading, error } = useDirectory(directoryId);

  const handleBack = () => {
    router.push(`/dashboard/directories/${directoryId}`);
  };

  if (error) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Ошибка загрузки</h3>
          <p className="text-red-600 text-sm mt-1">
            Не удалось загрузить справочник.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {directory?.name_ru || 'Записи справочника'}
          </h1>
          <p className="text-muted-foreground">
            Управление записями справочника
          </p>
        </div>
      </div>

      {/* Entry List */}
      <EntryList
        directoryId={directoryId}
        onEdit={(entry) => {
          console.log('Edit entry:', entry);
        }}
        onView={(entry) => {
          console.log('View entry:', entry);
        }}
      />
    </div>
  );
}
