# Files Documentation

> **Модуль**: `backend/src/modules/files/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Модуль управления файлами и фотографиями. Поддерживает полиморфную привязку файлов к любым сущностям системы (задачи, аппараты, инциденты и т.д.). Критически важен для фото-валидации задач.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FILES SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        FILE                                    │  │
│  │  ├── Полиморфная связь: entity_type + entity_id               │  │
│  │  ├── Категории: task_photo_before, task_photo_after, ...      │  │
│  │  ├── Метаданные изображений: width, height                    │  │
│  │  ├── Thumbnails для превью                                    │  │
│  │  └── Теги для поиска                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ENTITY TYPES                                │  │
│  │  ├── task → Фото до/после задачи                              │  │
│  │  ├── machine → Фото аппарата                                  │  │
│  │  ├── incident → Фото инцидента                                │  │
│  │  ├── complaint → Фото жалобы                                  │  │
│  │  ├── equipment → Фото компонента                              │  │
│  │  └── location → Фото локации                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: File

```typescript
@Entity('files')
@Index(['entity_type', 'entity_id'])
@Index(['category_code'])
@Index(['uploaded_by_user_id'])
export class File extends BaseEntity {
  // Информация о файле
  @Column({ type: 'varchar', length: 255 })
  original_filename: string;

  @Column({ type: 'varchar', length: 255 })
  stored_filename: string;  // UUID + extension

  @Column({ type: 'varchar', length: 255 })
  file_path: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;  // Байты

  // Категория
  @Column({ type: 'varchar', length: 50 })
  category_code: string;

  // Полиморфная связь
  @Column({ type: 'varchar', length: 50 })
  entity_type: string;  // task, machine, incident, etc.

  @Column({ type: 'varchar', length: 100 })
  entity_id: string;

  // Кто загрузил
  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User;

  // Дополнительно
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  // Для изображений
  @Column({ type: 'integer', nullable: true })
  image_width: number | null;

  @Column({ type: 'integer', nullable: true })
  image_height: number | null;

  // URLs
  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'text', nullable: true })
  thumbnail_url: string | null;

  // Метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Категории файлов (category_code)

### Задачи

| Код | Описание | Обязательность |
|-----|----------|----------------|
| task_photo_before | Фото ДО выполнения задачи | Обязательно |
| task_photo_after | Фото ПОСЛЕ выполнения задачи | Обязательно |
| task_photo_display | Фото дисплея аппарата | Опционально |
| task_photo_receipt | Фото чека | Опционально |

### Оборудование

| Код | Описание |
|-----|----------|
| machine_photo | Общее фото аппарата |
| machine_serial | Фото серийного номера |
| component_photo | Фото компонента |

### Инциденты и жалобы

| Код | Описание |
|-----|----------|
| incident_photo | Фото инцидента |
| complaint_photo | Фото жалобы |

### Документы

| Код | Описание |
|-----|----------|
| document | Общий документ |
| contract | Контракт |
| invoice | Счёт |

---

## Entity Types

| entity_type | Описание | Пример entity_id |
|-------------|----------|------------------|
| task | Задача | UUID задачи |
| machine | Аппарат | UUID аппарата |
| incident | Инцидент | UUID инцидента |
| complaint | Жалоба | UUID жалобы |
| equipment | Оборудование | UUID компонента |
| location | Локация | UUID локации |
| user | Пользователь (аватар) | UUID пользователя |

---

## Фото-валидация задач

**КРИТИЧЕСКИ ВАЖНО**: Задачи не могут быть завершены без обязательных фотографий.

```
┌─────────────────────────────────────────────────────────────────────┐
│                 TASK PHOTO VALIDATION                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Refill Task:                                                       │
│  ├── REQUIRED: task_photo_before (минимум 1)                        │
│  ├── REQUIRED: task_photo_after (минимум 1)                         │
│  └── OPTIONAL: task_photo_display, task_photo_receipt               │
│                                                                     │
│  Collection Task:                                                   │
│  ├── REQUIRED: task_photo_before (минимум 1)                        │
│  ├── REQUIRED: task_photo_after (минимум 1)                         │
│  └── OPTIONAL: task_photo_receipt                                   │
│                                                                     │
│  Maintenance Task:                                                  │
│  ├── REQUIRED: task_photo_before (минимум 1)                        │
│  └── REQUIRED: task_photo_after (минимум 1)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Загрузка файла

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
entity_type: task
entity_id: uuid-задачи
category_code: task_photo_before
description: "Фото до пополнения"
tags: ["refill", "machine-001"]
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "original_filename": "photo.jpg",
  "stored_filename": "abc123-def456.jpg",
  "file_path": "/uploads/2025/01/abc123-def456.jpg",
  "mime_type": "image/jpeg",
  "file_size": 1048576,
  "category_code": "task_photo_before",
  "entity_type": "task",
  "entity_id": "uuid-задачи",
  "url": "https://storage.vendhub.uz/uploads/...",
  "thumbnail_url": "https://storage.vendhub.uz/thumbnails/...",
  "image_width": 1920,
  "image_height": 1080,
  "created_at": "2025-01-15T10:00:00Z"
}
```

### Получить файлы сущности

```http
GET /api/files?entity_type=task&entity_id=uuid-задачи
Authorization: Bearer <token>
```

### Получить файлы по категории

```http
GET /api/files?entity_type=task&entity_id=uuid&category_code=task_photo_before
Authorization: Bearer <token>
```

### Удалить файл

```http
DELETE /api/files/:id
Authorization: Bearer <token>
```

### Скачать файл

```http
GET /api/files/:id/download
Authorization: Bearer <token>
```

---

## Хранение файлов

### Локальное хранение

```
/uploads/
├── 2025/
│   ├── 01/
│   │   ├── abc123-def456.jpg
│   │   ├── abc123-def456-thumb.jpg
│   │   └── ...
│   └── 02/
│       └── ...
└── thumbnails/
    └── ...
```

### Cloudflare R2 (опционально)

```
Bucket: vendhub-files
├── uploads/
│   └── 2025/01/...
└── thumbnails/
    └── 2025/01/...
```

---

## Metadata

Пример метаданных для фотографии:

```json
{
  "camera_make": "Samsung",
  "camera_model": "Galaxy S21",
  "capture_date": "2025-01-15T10:00:00Z",
  "gps_latitude": 41.311081,
  "gps_longitude": 69.280037,
  "orientation": 1,
  "flash": false
}
```

---

## Связи

- **Task** - фото до/после задачи
- **Machine** - фото аппарата
- **Incident** - фото инцидента
- **Complaint** - фото жалобы
- **Equipment** - фото компонентов
- **User** - аватар пользователя

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-FILE-01 | Загрузка файлов через API |
| REQ-FILE-02 | Полиморфная привязка к сущностям |
| REQ-FILE-03 | Категоризация файлов |
| REQ-FILE-10 | Обязательные фото для задач |
| REQ-FILE-11 | Автоматические thumbnails |
| REQ-FILE-20 | Поддержка локального хранения |
| REQ-FILE-21 | Поддержка Cloudflare R2 |
