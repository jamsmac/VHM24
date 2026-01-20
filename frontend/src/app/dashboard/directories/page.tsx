'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, FolderOpen, Database, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirectories } from '@/features/directories/hooks';
import { DirectoryType, DirectoryScope } from '@/features/directories/types';

const typeLabels: Record<DirectoryType, string> = {
  [DirectoryType.INTERNAL]: 'Внутренний',
  [DirectoryType.EXTERNAL]: 'Внешний',
  [DirectoryType.EXTERNAL_WITH_LOCAL]: 'Внешний + локальный',
  [DirectoryType.PARAMETRIC]: 'Параметрический',
  [DirectoryType.TEMPLATE]: 'Шаблонный',
};

const scopeLabels: Record<DirectoryScope, string> = {
  [DirectoryScope.GLOBAL]: 'Глобальный',
  [DirectoryScope.ORGANIZATION]: 'Организация',
  [DirectoryScope.USER]: 'Пользователь',
};

const typeColors: Record<DirectoryType, string> = {
  [DirectoryType.INTERNAL]: 'bg-blue-100 text-blue-800',
  [DirectoryType.EXTERNAL]: 'bg-green-100 text-green-800',
  [DirectoryType.EXTERNAL_WITH_LOCAL]: 'bg-purple-100 text-purple-800',
  [DirectoryType.PARAMETRIC]: 'bg-orange-100 text-orange-800',
  [DirectoryType.TEMPLATE]: 'bg-gray-100 text-gray-800',
};

export default function DirectoriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const { data: directories, isLoading, error } = useDirectories({
    search: search || undefined,
    type: typeFilter !== 'all' ? (typeFilter as DirectoryType) : undefined,
    scope: scopeFilter !== 'all' ? (scopeFilter as DirectoryScope) : undefined,
  });

  const handleCreateNew = () => {
    router.push('/dashboard/directories/new');
  };

  const handleViewDirectory = (id: string) => {
    router.push(`/dashboard/directories/${id}`);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Ошибка загрузки</h3>
          <p className="text-red-600 text-sm mt-1">
            Не удалось загрузить список справочников. Попробуйте обновить страницу.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Справочники</h1>
          <p className="text-muted-foreground mt-1">
            Управление справочниками и словарями данных
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Создать справочник
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию или коду..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Область" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все области</SelectItem>
                {Object.entries(scopeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : directories && directories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {directories.map((directory) => (
            <Card
              key={directory.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewDirectory(directory.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {directory.directory_type === DirectoryType.EXTERNAL ||
                    directory.directory_type === DirectoryType.EXTERNAL_WITH_LOCAL ? (
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Database className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg">{directory.name_ru}</CardTitle>
                  </div>
                  <Badge className={typeColors[directory.directory_type]}>
                    {typeLabels[directory.directory_type]}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-xs">
                  {directory.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {directory.description_ru && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {directory.description_ru}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {directory.fields?.length || 0} полей
                  </span>
                  <Badge variant="outline">{scopeLabels[directory.scope]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Справочники не найдены</h3>
              <p className="text-muted-foreground mt-1">
                {search || typeFilter !== 'all' || scopeFilter !== 'all'
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Создайте первый справочник для начала работы'}
              </p>
              {!search && typeFilter === 'all' && scopeFilter === 'all' && (
                <Button className="mt-4" onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать справочник
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
