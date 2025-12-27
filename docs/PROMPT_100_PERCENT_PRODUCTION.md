# MEGA-PROMPT: VendHub Manager → 100% Production Ready (АКТУАЛЬНАЯ ВЕРСИЯ)

> **Версия**: 2.0.0
> **Дата**: 2025-12-27
> **Статус проекта**: ~85% готов (проверено)

---

## ВАЖНО: РЕЗУЛЬТАТЫ ВЕРИФИКАЦИИ

Перед созданием этого промпта была проведена проверка кодовой базы.
Многие задачи из предыдущих планов **УЖЕ РЕАЛИЗОВАНЫ**:

### ✅ УЖЕ РЕАЛИЗОВАНО (не требует работы):

| Компонент | Статус | Файл |
|-----------|--------|------|
| **UserRole (7 ролей)** | ✅ Готово | `frontend/src/types/users.ts` |
| **Currency UZS** | ✅ Готово | `frontend/src/lib/utils.ts` |
| **Grouped Sidebar** | ✅ Готово | `frontend/src/components/layout/Sidebar.tsx` |
| **ExportButton** | ✅ Готово | `frontend/src/components/ui/ExportButton.tsx` |
| **ProductTour** | ✅ Готово | `frontend/src/components/ui/ProductTour.tsx` |
| **TaskListScreen** | ✅ Готово | `mobile/src/screens/Tasks/TaskListScreen.tsx` |
| **TaskDetailScreen** | ✅ Готово | `mobile/src/screens/Tasks/TaskDetailScreen.tsx` |
| **TaskCameraScreen** | ✅ Готово | `mobile/src/screens/Tasks/TaskCameraScreen.tsx` |

---

## ИНСТРУКЦИЯ ДЛЯ CLAUDE CODE

Ты должен довести проект VendHub Manager (VHM24) до 100% production ready состояния.

### КРИТИЧЕСКИЕ ПРАВИЛА

1. **НИКОГДА не останавливайся** пока все фазы не завершены
2. **ADDITIVE ONLY** - только добавляй, никогда не удаляй существующий код
3. **TEST AFTER EACH CHANGE** - после каждого изменения запускай тесты
4. **COMMIT ЧАСТО** - коммить каждую завершённую задачу
5. **ПРОВЕРЯЙ СНАЧАЛА** - перед изменением файла убедись что функционал не реализован

---

## ФАЗА 0: УСТАНОВКА ЗАВИСИМОСТЕЙ И ВАЛИДАЦИЯ

### 0.1 Установи зависимости

```bash
cd /home/user/VHM24

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Mobile
cd ../mobile && npm install
```

### 0.2 Проверь что всё билдится

```bash
cd backend && npm run build
cd ../frontend && npm run build
cd ../mobile && npm run lint
```

### 0.3 Запусти тесты

```bash
cd backend && npm run test
cd ../frontend && npm run test 2>/dev/null || echo "Frontend tests not configured"
```

### 0.4 Создай файл прогресса

Создай `docs/PRODUCTION_PROGRESS.md`:
- Запиши результаты билда
- Запиши количество passing/failing тестов
- Запиши текущий coverage

**НЕ ПРОДОЛЖАЙ** пока backend не билдится без ошибок.

---

## ФАЗА 1: MOBILE OFFLINE QUEUE (Единственное критичное отсутствующее)

### 1.1 TASK: Создать Offline Queue Service

**Файл**: `mobile/src/services/offlineQueue.ts`

```typescript
/**
 * Offline Queue Service
 * Сохраняет действия при отсутствии сети и синхронизирует при восстановлении
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  type: 'task_status' | 'task_complete' | 'photo_upload';
  payload: any;
  createdAt: string;
  retryCount: number;
}

const QUEUE_KEY = 'vhm_offline_queue';
const MAX_RETRIES = 3;

class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isOnline: boolean = true;
  private isSyncing: boolean = false;

  async init() {
    // Load persisted queue
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      this.queue = JSON.parse(stored);
    }

    // Listen for network changes
    NetInfo.addEventListener(this.handleNetworkChange);

    // Check initial state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    // Sync if online and has items
    if (this.isOnline && this.queue.length > 0) {
      this.syncQueue();
    }
  }

  private handleNetworkChange = (state: NetInfoState) => {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected ?? true;

    if (wasOffline && this.isOnline && this.queue.length > 0) {
      this.syncQueue();
    }
  };

  async addToQueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retryCount'>) {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(queuedAction);
    await this.persistQueue();

    if (this.isOnline) {
      this.syncQueue();
    }

    return queuedAction.id;
  }

  async syncQueue() {
    if (this.isSyncing || this.queue.length === 0) return;

    this.isSyncing = true;

    const processQueue = [...this.queue];

    for (const action of processQueue) {
      try {
        await this.processAction(action);
        this.queue = this.queue.filter(a => a.id !== action.id);
      } catch (error) {
        action.retryCount++;
        if (action.retryCount >= MAX_RETRIES) {
          console.error(`Action ${action.id} failed after ${MAX_RETRIES} retries`);
          this.queue = this.queue.filter(a => a.id !== action.id);
        }
      }
    }

    await this.persistQueue();
    this.isSyncing = false;
  }

  private async processAction(action: QueuedAction): Promise<void> {
    // Import apiClient dynamically to avoid circular deps
    const { default: apiClient } = await import('./api');

    switch (action.type) {
      case 'task_status':
        await apiClient.updateTaskStatus(action.payload.taskId, action.payload.status);
        break;
      case 'task_complete':
        await apiClient.completeTask(action.payload.taskId, action.payload.notes);
        break;
      case 'photo_upload':
        await apiClient.uploadTaskPhoto(
          action.payload.taskId,
          action.payload.uri,
          action.payload.caption
        );
        break;
    }
  }

  private async persistQueue() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isNetworkOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineQueue = new OfflineQueueService();
export default offlineQueue;
```

**Коммит**: `feat(mobile): implement offline queue service`

---

### 1.2 TASK: Интегрировать Offline Queue в App

**Файл**: `mobile/App.tsx` или `mobile/src/App.tsx`

Добавь инициализацию:

```typescript
import { useEffect } from 'react';
import { offlineQueue } from './src/services/offlineQueue';

// В компоненте App:
useEffect(() => {
  offlineQueue.init();
}, []);
```

**Коммит**: `feat(mobile): initialize offline queue on app start`

---

### 1.3 TASK: Добавить индикатор offline статуса

**Новый файл**: `mobile/src/components/OfflineIndicator.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineQueue } from '../services/offlineQueue';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const queueLength = offlineQueue.getQueueLength();

  if (isOnline && queueLength === 0) return null;

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      {!isOnline ? (
        <Text style={styles.text}>📴 Нет сети</Text>
      ) : (
        <Text style={styles.text}>🔄 Синхронизация ({queueLength})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f59e0b',
    padding: 8,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: '#ef4444',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

**Коммит**: `feat(mobile): add offline status indicator`

---

## ФАЗА 2: BACKEND ТЕСТИРОВАНИЕ И СТАБИЛИЗАЦИЯ

### 2.1 TASK: Запустить все тесты и исправить failing

```bash
cd backend
npm run test 2>&1 | tee test-results.txt
```

Для каждого failing теста:
1. Определи причину
2. Исправь тест или код
3. Проверь снова

**Цель**: 100% тестов проходят

**Коммит**: `fix(backend): fix failing tests`

---

### 2.2 TASK: Увеличить test coverage до 80%

```bash
npm run test:cov
```

Добавь тесты для модулей с coverage < 80%:
- auth
- users
- machines
- tasks
- commissions

**Коммит**: `test(backend): increase test coverage to 80%+`

---

### 2.3 TASK: Проверить все endpoints защищены

```bash
grep -rL "@UseGuards" backend/src/modules/*/controllers/*.controller.ts
```

Для каждого незащищённого контроллера добавь guards.

**Коммит**: `security(backend): add guards to all controllers`

---

## ФАЗА 3: FRONTEND ТЕСТИРОВАНИЕ

### 3.1 TASK: Настроить и запустить тесты

Проверь есть ли тесты:
```bash
cd frontend
ls -la **/*.test.* **/*.spec.* 2>/dev/null | head -20
```

Если тестов нет - создай базовые:
- Тест для utils (formatCurrency, formatDate)
- Тест для hooks (useAuth)

**Коммит**: `test(frontend): add unit tests`

---

### 3.2 TASK: Проверить build без ошибок

```bash
cd frontend && npm run build
```

Исправь все TypeScript ошибки.

**Коммит**: `fix(frontend): fix TypeScript errors`

---

## ФАЗА 4: E2E ТЕСТЫ

### 4.1 TASK: Настроить Playwright

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

### 4.2 TASK: Создать базовые E2E тесты

**Файл**: `frontend/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@vendhub.uz');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

**Коммит**: `test(e2e): add authentication E2E tests`

---

## ФАЗА 5: SECURITY AUDIT

### 5.1 TASK: npm audit

```bash
cd backend && npm audit --audit-level=high
cd ../frontend && npm audit --audit-level=high
cd ../mobile && npm audit --audit-level=high
```

Исправь все high и critical уязвимости.

**Коммит**: `security: fix npm audit vulnerabilities`

---

### 5.2 TASK: Проверка secrets

```bash
grep -rn "password\|secret\|api.key\|apiKey" --include="*.ts" --include="*.tsx" | grep -v "node_modules\|\.env\|test\|spec\|mock\|type\|interface"
```

Убедись что нет хардкоженных секретов.

**Коммит**: `security: remove hardcoded secrets`

---

## ФАЗА 6: DOCUMENTATION

### 6.1 TASK: Обновить README.md

Убедись что README содержит:
- Описание проекта
- Требования
- Инструкции по установке
- Команды для запуска
- Структуру проекта

**Коммит**: `docs: update README.md`

---

### 6.2 TASK: Проверить Swagger

```bash
cd backend && npm run start:dev
# Открой http://localhost:3000/api/docs
```

Убедись что все endpoints задокументированы.

**Коммит**: `docs: update Swagger documentation`

---

## ФАЗА 7: FINAL VALIDATION

### 7.1 Полная проверка

```bash
# Backend
cd backend
npm run build && npm run test && npm run lint

# Frontend
cd ../frontend
npm run build && npm run lint

# Mobile
cd ../mobile
npm run lint
```

**ВСЁ должно проходить без ошибок!**

### 7.2 Создай финальный отчёт

Обнови `docs/PRODUCTION_PROGRESS.md`:

```markdown
# Production Ready Report

## Final Status: ✅ READY

| Component | Build | Tests | Lint |
|-----------|-------|-------|------|
| Backend | ✅ | ✅ XX% | ✅ |
| Frontend | ✅ | ✅ | ✅ |
| Mobile | ✅ | ✅ | ✅ |

## Completed Tasks
- [x] Offline queue implemented
- [x] All tests passing
- [x] Security audit passed
- [x] Documentation updated

## Sign-off Date: YYYY-MM-DD
```

---

## КРИТЕРИИ УСПЕХА

Проект считается 100% Production Ready когда:

- [ ] Backend билдится без ошибок
- [ ] Frontend билдится без ошибок
- [ ] Mobile проходит lint
- [ ] Все backend тесты проходят (>=80% coverage)
- [ ] npm audit без high/critical
- [ ] Offline queue работает в mobile
- [ ] Документация актуальна

---

**ВАЖНО**: Не останавливайся пока ВСЕ критерии не выполнены!

