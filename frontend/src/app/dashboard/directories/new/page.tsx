'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Database,
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { directoryApi } from '@/features/directories/api';
import {
  DirectoryType,
  DirectoryScope,
  DirectoryFieldType,
} from '@/features/directories/types';

const typeOptions = [
  { value: DirectoryType.INTERNAL, label: 'Внутренний', description: 'Локальные данные организации' },
  { value: DirectoryType.EXTERNAL, label: 'Внешний', description: 'Синхронизация из внешнего источника' },
  { value: DirectoryType.EXTERNAL_WITH_LOCAL, label: 'Внешний + локальный', description: 'Внешние данные с возможностью добавления локальных' },
  { value: DirectoryType.PARAMETRIC, label: 'Параметрический', description: 'Справочник с параметрами' },
];

const scopeOptions = [
  { value: DirectoryScope.GLOBAL, label: 'Глобальный', description: 'Доступен всем организациям' },
  { value: DirectoryScope.ORGANIZATION, label: 'Организация', description: 'Только для текущей организации' },
  { value: DirectoryScope.USER, label: 'Пользователь', description: 'Персональный справочник' },
];

const fieldTypeOptions = [
  { value: DirectoryFieldType.TEXT, label: 'Текст' },
  { value: DirectoryFieldType.TEXTAREA, label: 'Многострочный текст' },
  { value: DirectoryFieldType.NUMBER, label: 'Число' },
  { value: DirectoryFieldType.DECIMAL, label: 'Десятичное' },
  { value: DirectoryFieldType.BOOLEAN, label: 'Логическое' },
  { value: DirectoryFieldType.DATE, label: 'Дата' },
  { value: DirectoryFieldType.DATETIME, label: 'Дата и время' },
  { value: DirectoryFieldType.SELECT, label: 'Выбор' },
  { value: DirectoryFieldType.MULTISELECT, label: 'Множественный выбор' },
  { value: DirectoryFieldType.REFERENCE, label: 'Ссылка на справочник' },
  { value: DirectoryFieldType.EMAIL, label: 'Email' },
  { value: DirectoryFieldType.PHONE, label: 'Телефон' },
  { value: DirectoryFieldType.URL, label: 'URL' },
];

const fieldSchema = z.object({
  code: z.string().min(1, 'Код обязателен').regex(/^[a-z][a-z0-9_]*$/, 'Только латиница, цифры и _'),
  name_ru: z.string().min(1, 'Название обязательно'),
  name_en: z.string().optional(),
  field_type: z.nativeEnum(DirectoryFieldType),
  is_required: z.boolean().default(false),
  is_unique: z.boolean().default(false),
  is_searchable: z.boolean().default(true),
  description_ru: z.string().optional(),
});

const formSchema = z.object({
  slug: z.string().min(1, 'Код обязателен').regex(/^[a-z][a-z0-9_-]*$/, 'Только латиница, цифры, - и _'),
  name_ru: z.string().min(1, 'Название обязательно'),
  name_en: z.string().optional(),
  description_ru: z.string().optional(),
  description_en: z.string().optional(),
  directory_type: z.nativeEnum(DirectoryType),
  scope: z.nativeEnum(DirectoryScope),
  is_hierarchical: z.boolean().default(false),
  fields: z.array(fieldSchema).min(1, 'Добавьте хотя бы одно поле'),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewDirectoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: '',
      name_ru: '',
      name_en: '',
      description_ru: '',
      description_en: '',
      directory_type: DirectoryType.INTERNAL,
      scope: DirectoryScope.ORGANIZATION,
      is_hierarchical: false,
      fields: [
        {
          code: 'name',
          name_ru: 'Название',
          name_en: 'Name',
          field_type: DirectoryFieldType.TEXT,
          is_required: true,
          is_unique: false,
          is_searchable: true,
        },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  const handleBack = () => {
    router.push('/dashboard/directories');
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await directoryApi.createDirectory({
        ...data,
        fields: data.fields.map((field, index) => ({
          ...field,
          sort_order: index,
        })),
      });

      toast({
        title: 'Справочник создан',
        description: `Справочник "${data.name_ru}" успешно создан`,
      });

      router.push(`/dashboard/directories/${result.id}`);
    } catch (error: any) {
      toast({
        title: 'Ошибка создания',
        description: error.message || 'Не удалось создать справочник',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addField = () => {
    append({
      code: '',
      name_ru: '',
      name_en: '',
      field_type: DirectoryFieldType.TEXT,
      is_required: false,
      is_unique: false,
      is_searchable: true,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новый справочник</h1>
          <p className="text-muted-foreground">
            Создание нового справочника данных
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
              <CardDescription>
                Укажите название и тип справочника
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Код (slug)</FormLabel>
                      <FormControl>
                        <Input placeholder="product_categories" {...field} />
                      </FormControl>
                      <FormDescription>
                        Уникальный идентификатор (латиница, цифры, - и _)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name_ru"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название (RU)</FormLabel>
                      <FormControl>
                        <Input placeholder="Категории товаров" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="directory_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип справочника</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {typeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {scopeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description_ru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Описание справочника..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
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
                      <FormLabel className="text-base">Иерархический справочник</FormLabel>
                      <FormDescription>
                        Записи могут иметь родительские элементы (древовидная структура)
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

          {/* Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Структура полей</CardTitle>
                  <CardDescription>
                    Определите поля справочника
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить поле
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="cursor-grab text-muted-foreground pt-2">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`fields.${index}.code`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Код</FormLabel>
                          <FormControl>
                            <Input placeholder="field_code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`fields.${index}.name_ru`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название</FormLabel>
                          <FormControl>
                            <Input placeholder="Название поля" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`fields.${index}.field_type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Тип</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fieldTypeOptions.map((option) => (
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

                    <div className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`fields.${index}.is_required`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 text-xs">Обяз.</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`fields.${index}.is_unique`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 text-xs">Уник.</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {form.formState.errors.fields?.root && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.fields.root.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Создание...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Создать справочник
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
