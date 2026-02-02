---
name: vhm24-forms
description: |
  VendHub Forms & Validation - сложные формы с React Hook Form и Zod.
  Multi-step wizards, динамические формы, валидация, MDM directory builder.
  Использовать при создании сложных форм и визардов.
---

# VendHub Forms & Validation

Паттерны для сложных форм с React Hook Form и Zod.

## Когда использовать

- CRUD формы
- Multi-step визарды
- Динамические формы (MDM)
- Сложная валидация
- Зависимые поля

## Базовая настройка

```typescript
// Зависимости
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```

## Простая форма

```tsx
// Схема валидации
const productSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(100),
  price: z.number().positive("Цена должна быть положительной"),
  category: z.enum(["coffee", "tea", "snack", "drink"]),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

// Компонент формы
function ProductForm({ product, onSubmit }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: "",
      price: 0,
      category: "coffee",
      description: "",
      isActive: true,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Название</Label>
        <Input
          id="name"
          {...register("name")}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="price">Цена (UZS)</Label>
        <Input
          id="price"
          type="number"
          {...register("price", { valueAsNumber: true })}
        />
        {errors.price && (
          <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category">Категория</Label>
        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coffee">Кофе</SelectItem>
                <SelectItem value="tea">Чай</SelectItem>
                <SelectItem value="snack">Снэки</SelectItem>
                <SelectItem value="drink">Напитки</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="flex items-center gap-2">
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Checkbox
              id="isActive"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isActive">Активен</Label>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Сохранить
      </Button>
    </form>
  );
}
```

## Multi-Step Wizard

```tsx
// schemas/importWizard.ts
const step1Schema = z.object({
  sourceType: z.enum(["excel", "csv", "api"]),
  file: z.instanceof(File).optional(),
  apiUrl: z.string().url().optional(),
}).refine(
  (data) => {
    if (data.sourceType === "api") return !!data.apiUrl;
    return !!data.file;
  },
  { message: "Загрузите файл или укажите URL API" }
);

const step2Schema = z.object({
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    transform: z.enum(["none", "uppercase", "lowercase", "trim"]).optional(),
  })).min(1, "Укажите хотя бы одно сопоставление"),
});

const step3Schema = z.object({
  updateExisting: z.boolean(),
  skipErrors: z.boolean(),
  notifyOnComplete: z.boolean(),
});

// Компонент визарда
function ImportWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<ImportData>>({});

  const steps = [
    { title: "Источник", schema: step1Schema, component: Step1Source },
    { title: "Сопоставление", schema: step2Schema, component: Step2Mapping },
    { title: "Настройки", schema: step3Schema, component: Step3Settings },
    { title: "Подтверждение", schema: z.object({}), component: Step4Confirm },
  ];

  const currentStep = steps[step - 1];
  const StepComponent = currentStep.component;

  const handleStepSubmit = (stepData: unknown) => {
    const newData = { ...data, ...stepData };
    setData(newData);

    if (step < steps.length) {
      setStep(step + 1);
    } else {
      // Финальная отправка
      handleImport(newData as ImportData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                  index + 1 < step && "bg-green-500 text-white",
                  index + 1 === step && "bg-amber-500 text-white",
                  index + 1 > step && "bg-gray-200 text-gray-500"
                )}
              >
                {index + 1 < step ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2",
                    index + 1 < step ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s, index) => (
            <span
              key={index}
              className={cn(
                "text-sm",
                index + 1 === step ? "text-amber-600 font-medium" : "text-gray-500"
              )}
            >
              {s.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStep.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <StepComponent
            data={data}
            onSubmit={handleStepSubmit}
            onBack={() => setStep(step - 1)}
            isFirst={step === 1}
            isLast={step === steps.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Пример шага
function Step1Source({ data, onSubmit, isFirst }: StepProps) {
  const form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: data,
  });

  const sourceType = form.watch("sourceType");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="sourceType"
        control={form.control}
        render={({ field }) => (
          <RadioGroup onValueChange={field.onChange} value={field.value}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="excel" />
              <Label htmlFor="excel">Excel файл</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv">CSV файл</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="api" id="api" />
              <Label htmlFor="api">API</Label>
            </div>
          </RadioGroup>
        )}
      />

      {(sourceType === "excel" || sourceType === "csv") && (
        <Controller
          name="file"
          control={form.control}
          render={({ field }) => (
            <FileUpload
              accept={sourceType === "excel" ? ".xlsx,.xls" : ".csv"}
              onChange={(file) => field.onChange(file)}
              value={field.value}
            />
          )}
        />
      )}

      {sourceType === "api" && (
        <Input
          placeholder="https://api.example.com/data"
          {...form.register("apiUrl")}
        />
      )}

      <div className="flex justify-end">
        <Button type="submit">Далее</Button>
      </div>
    </form>
  );
}
```

## Динамические поля (useFieldArray)

```tsx
// Рецепт продукта с ингредиентами
const recipeSchema = z.object({
  productName: z.string().min(1),
  ingredients: z.array(z.object({
    ingredientId: z.number(),
    amount: z.number().positive(),
    unit: z.enum(["g", "ml", "pcs"]),
  })).min(1, "Добавьте хотя бы один ингредиент"),
});

function RecipeForm({ onSubmit }: RecipeFormProps) {
  const form = useForm({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      productName: "",
      ingredients: [{ ingredientId: 0, amount: 0, unit: "g" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const { data: ingredientOptions } = api.ingredients.list.useQuery();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label>Название продукта</Label>
        <Input {...form.register("productName")} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Ингредиенты</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ingredientId: 0, amount: 0, unit: "g" })}
          >
            <Plus className="w-4 h-4 mr-1" />
            Добавить
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="flex-1">
              <Controller
                name={`ingredients.${index}.ingredientId`}
                control={form.control}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ингредиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientOptions?.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id.toString()}>
                          {ing.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Input
              type="number"
              className="w-24"
              placeholder="Кол-во"
              {...form.register(`ingredients.${index}.amount`, {
                valueAsNumber: true,
              })}
            />

            <Controller
              name={`ingredients.${index}.unit`}
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">г</SelectItem>
                    <SelectItem value="ml">мл</SelectItem>
                    <SelectItem value="pcs">шт</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="submit">Сохранить рецепт</Button>
    </form>
  );
}
```

## Условная валидация

```typescript
// Валидация зависит от типа автомата
const machineSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["coffee", "snack", "combo"]),

  // Только для кофейных автоматов
  coffeeSettings: z.object({
    waterTemperature: z.number().min(80).max(100),
    grindSize: z.number().min(1).max(10),
  }).optional(),

  // Только для снэковых автоматов
  snackSettings: z.object({
    shelfCount: z.number().min(1).max(10),
    coolingEnabled: z.boolean(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.type === "coffee" && !data.coffeeSettings) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Настройки кофе обязательны",
      path: ["coffeeSettings"],
    });
  }

  if (data.type === "snack" && !data.snackSettings) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Настройки снэков обязательны",
      path: ["snackSettings"],
    });
  }
});
```

## MDM Directory Builder (динамическая схема)

```tsx
// Конструктор справочника с JSONB схемой
interface FieldDefinition {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  required: boolean;
  options?: string[]; // для select
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

function DirectorySchemaBuilder({ onSave }: { onSave: (schema: FieldDefinition[]) => void }) {
  const [fields, setFields] = useState<FieldDefinition[]>([]);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        name: "",
        type: "text",
        required: false,
      },
    ]);
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card key={field.id} className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <Input
              placeholder="Название поля"
              value={field.name}
              onChange={(e) => updateField(field.id, { name: e.target.value })}
            />

            <Select
              value={field.type}
              onValueChange={(type) => updateField(field.id, { type: type as FieldDefinition["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Текст</SelectItem>
                <SelectItem value="number">Число</SelectItem>
                <SelectItem value="date">Дата</SelectItem>
                <SelectItem value="select">Выбор</SelectItem>
                <SelectItem value="boolean">Да/Нет</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField(field.id, { required: checked as boolean })
                }
              />
              <Label>Обязательное</Label>
            </div>

            <Button variant="ghost" size="icon" onClick={() => removeField(field.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {field.type === "select" && (
            <div className="mt-2">
              <Label>Варианты (через запятую)</Label>
              <Input
                placeholder="Вариант 1, Вариант 2, ..."
                value={field.options?.join(", ") || ""}
                onChange={(e) =>
                  updateField(field.id, {
                    options: e.target.value.split(",").map((s) => s.trim()),
                  })
                }
              />
            </div>
          )}
        </Card>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={addField}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить поле
        </Button>
        <Button onClick={() => onSave(fields)}>Сохранить схему</Button>
      </div>
    </div>
  );
}

// Генерация Zod схемы из определения полей
function generateZodSchema(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let zodType: z.ZodTypeAny;

    switch (field.type) {
      case "text":
        zodType = z.string();
        break;
      case "number":
        zodType = z.number();
        if (field.validation?.min !== undefined) {
          zodType = (zodType as z.ZodNumber).min(field.validation.min);
        }
        if (field.validation?.max !== undefined) {
          zodType = (zodType as z.ZodNumber).max(field.validation.max);
        }
        break;
      case "date":
        zodType = z.coerce.date();
        break;
      case "select":
        zodType = z.enum(field.options as [string, ...string[]]);
        break;
      case "boolean":
        zodType = z.boolean();
        break;
    }

    if (!field.required) {
      zodType = zodType.optional();
    }

    shape[field.id] = zodType;
  }

  return z.object(shape);
}
```

## Form UI компоненты

```tsx
// Обёртка поля с ошибкой
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className={error ? "text-red-500" : ""}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

// Использование
<FormField label="Email" error={errors.email?.message} required>
  <Input type="email" {...register("email")} />
</FormField>
```

## Ссылки

- `references/validation-patterns.md` - Паттерны Zod валидации
- `references/form-components.md` - UI компоненты форм
