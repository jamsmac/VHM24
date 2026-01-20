'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  List,
  Plus,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
  Database,
  ExternalLink,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirectory } from '@/features/directories/hooks';
import { EntryList } from '@/features/directories/components';
import {
  DirectoryType,
  DirectoryScope,
  DirectoryFieldType,
} from '@/features/directories/types';

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

const fieldTypeLabels: Record<DirectoryFieldType, string> = {
  [DirectoryFieldType.TEXT]: 'Текст',
  [DirectoryFieldType.TEXTAREA]: 'Многострочный текст',
  [DirectoryFieldType.NUMBER]: 'Число',
  [DirectoryFieldType.DECIMAL]: 'Десятичное',
  [DirectoryFieldType.BOOLEAN]: 'Логическое',
  [DirectoryFieldType.DATE]: 'Дата',
  [DirectoryFieldType.DATETIME]: 'Дата и время',
  [DirectoryFieldType.SELECT]: 'Выбор',
  [DirectoryFieldType.MULTISELECT]: 'Множественный выбор',
  [DirectoryFieldType.REFERENCE]: 'Ссылка',
  [DirectoryFieldType.FILE]: 'Файл',
  [DirectoryFieldType.IMAGE]: 'Изображение',
  [DirectoryFieldType.EMAIL]: 'Email',
  [DirectoryFieldType.PHONE]: 'Телефон',
  [DirectoryFieldType.URL]: 'URL',
  [DirectoryFieldType.JSON]: 'JSON',
};

export default function DirectoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const directoryId = params.id as string;
  const [activeTab, setActiveTab] = useState('entries');

  const { data: directory, isLoading, error } = useDirectory(directoryId);

  const handleBack = () => {
    router.push('/dashboard/directories');
  };

  const handleSettings = () => {
    router.push(`/dashboard/directories/${directoryId}/settings`);
  };

  const handleCreateEntry = () => {
    // TODO: Open create entry modal
  };

  const handleExport = () => {
    // TODO: Export entries
  };

  const handleImport = () => {
    // TODO: Import entries
  };

  const handleSync = () => {
    // TODO: Sync with external source
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
            Не удалось загрузить справочник. Возможно, он был удален.
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
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!directory) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div className="text-center py-12">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Справочник не найден</h3>
        </div>
      </div>
    );
  }

  const isExternal =
    directory.directory_type === DirectoryType.EXTERNAL ||
    directory.directory_type === DirectoryType.EXTERNAL_WITH_LOCAL;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              {isExternal ? (
                <ExternalLink className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Database className="h-6 w-6 text-muted-foreground" />
              )}
              <h1 className="text-2xl font-bold">{directory.name_ru}</h1>
              <Badge variant="secondary">{typeLabels[directory.directory_type]}</Badge>
              <Badge variant="outline">{scopeLabels[directory.scope]}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {directory.slug}
            </p>
            {directory.description_ru && (
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {directory.description_ru}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExternal && (
            <Button variant="outline" size="sm" onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Синхронизировать
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Импорт
          </Button>
          <Button onClick={handleCreateEntry}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить запись
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Архивировать справочник
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries">
            <List className="h-4 w-4 mr-2" />
            Записи
          </TabsTrigger>
          <TabsTrigger value="fields">
            <Database className="h-4 w-4 mr-2" />
            Поля ({directory.fields?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-6">
          <EntryList
            directoryId={directoryId}
            onEdit={(entry) => {
              // TODO: Open edit modal
              console.log('Edit entry:', entry);
            }}
            onView={(entry) => {
              // TODO: Open view modal
              console.log('View entry:', entry);
            }}
          />
        </TabsContent>

        <TabsContent value="fields" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Структура полей</CardTitle>
              <CardDescription>
                Определение полей справочника и правила валидации
              </CardDescription>
            </CardHeader>
            <CardContent>
              {directory.fields && directory.fields.length > 0 ? (
                <div className="space-y-4">
                  {directory.fields
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.name_ru}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {field.code}
                            </Badge>
                            {field.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Обязательное
                              </Badge>
                            )}
                            {field.is_unique && (
                              <Badge variant="secondary" className="text-xs">
                                Уникальное
                              </Badge>
                            )}
                          </div>
                          {field.description_ru && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {field.description_ru}
                            </p>
                          )}
                        </div>
                        <Badge>{fieldTypeLabels[field.field_type]}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Поля не определены
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История изменений</CardTitle>
              <CardDescription>
                Последние изменения в справочнике
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                История изменений будет доступна здесь
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Создан</span>
              <p className="font-medium">
                {new Date(directory.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Обновлен</span>
              <p className="font-medium">
                {new Date(directory.updated_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Версия</span>
              <p className="font-medium">{directory.version || 1}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Иерархический</span>
              <p className="font-medium">{directory.is_hierarchical ? 'Да' : 'Нет'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
