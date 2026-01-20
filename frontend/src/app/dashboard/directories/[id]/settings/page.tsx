'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDirectory } from '@/features/directories/hooks';
import { directoryApi } from '@/features/directories/api';
import { DirectoryType, DirectoryScope } from '@/features/directories/types';

const typeOptions = [
  { value: DirectoryType.INTERNAL, label: 'Внутренний' },
  { value: DirectoryType.EXTERNAL, label: 'Внешний' },
  { value: DirectoryType.EXTERNAL_WITH_LOCAL, label: 'Внешний + локальный' },
  { value: DirectoryType.PARAMETRIC, label: 'Параметрический' },
];

const scopeOptions = [
  { value: DirectoryScope.GLOBAL, label: 'Глобальный' },
  { value: DirectoryScope.ORGANIZATION, label: 'Организация' },
  { value: DirectoryScope.USER, label: 'Пользователь' },
];

const formSchema = z.object({
  name_ru: z.string().min(1, 'Название обязательно'),
  name_en: z.string().optional(),
  description_ru: z.string().optional(),
  description_en: z.string().optional(),
  directory_type: z.nativeEnum(DirectoryType),
  scope: z.nativeEnum(DirectoryScope),
  is_hierarchical: z.boolean(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DirectorySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const directoryId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: directory, isLoading, error, refetch } = useDirectory(directoryId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: directory
      ? {
          name_ru: directory.name_ru,
          name_en: directory.name_en || '',
          description_ru: directory.description_ru || '',
          description_en: directory.description_en || '',
          directory_type: directory.directory_type,
          scope: directory.scope,
          is_hierarchical: directory.is_hierarchical || false,
          is_active: directory.is_active !== false,
        }
      : undefined,
  });

  const handleBack = () => {
    router.push(`/dashboard/directories/${directoryId}`);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await directoryApi.updateDirectory(directoryId, data);
      toast({
        title: 'Настройки сохранены',
        description: 'Изменения успешно сохранены',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Ошибка сохранения',
        description: error.message || 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await directoryApi.archiveDirectory(directoryId);
      toast({
        title: 'Справочник архивирован',
        description: 'Справочник успешно перемещен в архив',
      });
      router.push('/dashboard/directories');
    } catch (error: any) {
      toast({
        title: 'Ошибка удаления',
        description: error.message || 'Не удалось архивировать справочник',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
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
            Не удалось загрузить настройки справочника.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Настройки справочника</h1>
          <p className="text-muted-foreground">{directory?.name_ru}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>
                Название и описание справочника
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name_ru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название (RU)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название (EN)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description_ru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Type Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Тип и область видимости</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="directory_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип справочника</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Область видимости</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {scopeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_hierarchical"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Иерархический справочник</FormLabel>
                      <FormDescription>
                        Записи могут иметь родительские элементы
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Активен</FormLabel>
                      <FormDescription>
                        Справочник доступен для использования
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Архивировать
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Архивировать справочник?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Справочник будет перемещен в архив. Все записи останутся, но
                    справочник не будет доступен для выбора в формах. Это действие
                    можно отменить.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Архивирование...' : 'Архивировать'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleBack}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Сохранение...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
