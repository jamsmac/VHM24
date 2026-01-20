'use client';

/**
 * InlineCreateModal Component
 *
 * A modal for quickly creating new directory entries inline.
 * Shows required fields and allows immediate selection after creation.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, AlertCircle } from 'lucide-react';
import { useCreateEntry } from '../../hooks/useEntries';
import { useLocalizedField } from '../../hooks/useLocalized';
import type { Directory, DirectoryEntry, DirectoryField, DirectoryFieldType } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface InlineCreateModalProps {
  /** Directory to create entry in */
  directory: Directory;
  /** Initial name value */
  initialName: string;
  /** Callback when entry is created */
  onCreated: (entry: DirectoryEntry) => void;
  /** Callback to close modal */
  onClose: () => void;
}

interface FormValues {
  code: string;
  name_ru: string;
  name_en?: string;
  data: Record<string, any>;
}

export function InlineCreateModal({
  directory,
  initialName,
  onCreated,
  onClose,
}: InlineCreateModalProps) {
  const [error, setError] = useState<string | null>(null);
  const createEntry = useCreateEntry(directory.id);

  // Get required fields (excluding code and name)
  const requiredFields = directory.fields.filter(
    (f) => f.is_required && f.is_active && !['code', 'name_ru', 'name_en'].includes(f.code),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      code: '',
      name_ru: initialName,
      name_en: '',
      data: {},
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setError(null);
      const entry = await createEntry.mutateAsync({
        code: values.code,
        name_ru: values.name_ru,
        name_en: values.name_en || undefined,
        data: values.data,
      });
      onCreated(entry);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Ошибка при создании записи';
      setError(errorMessage);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить в «{directory.name_ru}»</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {/* Error alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Code field */}
            <div className="grid gap-2">
              <Label htmlFor="code">Код *</Label>
              <Input
                id="code"
                {...register('code', { required: 'Обязательное поле' })}
                placeholder="Например: PROD-001"
              />
              {errors.code && (
                <span className="text-sm text-destructive">{errors.code.message}</span>
              )}
            </div>

            {/* Name field */}
            <div className="grid gap-2">
              <Label htmlFor="name_ru">Название (RU) *</Label>
              <Input
                id="name_ru"
                {...register('name_ru', { required: 'Обязательное поле' })}
                autoFocus
              />
              {errors.name_ru && (
                <span className="text-sm text-destructive">{errors.name_ru.message}</span>
              )}
            </div>

            {/* English name (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="name_en">Название (EN)</Label>
              <Input id="name_en" {...register('name_en')} />
            </div>

            {/* Required custom fields */}
            {requiredFields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
              />
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать и выбрать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dynamic field input based on type
interface FieldInputProps {
  field: DirectoryField;
  register: any;
  errors: any;
  setValue: any;
  watch: any;
}

function FieldInput({ field, register, errors, setValue, watch }: FieldInputProps) {
  const label = useLocalizedField(field);
  const fieldName = `data.${field.code}` as const;
  const fieldError = errors.data?.[field.code];

  const commonProps = {
    id: field.code,
    placeholder: field.placeholder || undefined,
  };

  switch (field.field_type) {
    case 'text':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Textarea
            {...commonProps}
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
            rows={3}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'number':
    case 'decimal':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            type="number"
            step={field.field_type === 'decimal' ? '0.01' : '1'}
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
              valueAsNumber: true,
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.code}
            checked={watch(fieldName) || false}
            onCheckedChange={(checked) => setValue(fieldName, checked)}
          />
          <Label htmlFor={field.code} className="cursor-pointer">
            {label}
          </Label>
        </div>
      );

    case 'date':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            type="date"
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'datetime':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            type="datetime-local"
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'email':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            type="email"
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Некорректный email',
              },
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'url':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            type="url"
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'phone':
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <Input
            {...commonProps}
            type="tel"
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    case 'select':
      if (!field.options?.length) return null;
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.code}>
            {label} {field.is_required && '*'}
          </Label>
          <select
            {...commonProps}
            {...register(fieldName, {
              required: field.is_required && 'Обязательное поле',
            })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Выберите...</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label_ru}
              </option>
            ))}
          </select>
          {fieldError && (
            <span className="text-sm text-destructive">{fieldError.message}</span>
          )}
        </div>
      );

    default:
      // For complex types (REFERENCE, MULTISELECT, FILE, IMAGE, JSON)
      // we skip them in inline create - user can edit after creation
      return null;
  }
}

export default InlineCreateModal;
