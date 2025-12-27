# PROMPT: VendHub Manager → 100% Production Ready (v2.0)

**СКОПИРУЙ ЭТОТ ТЕКСТ И ВСТАВЬ В НОВУЮ СЕССИЮ CLAUDE CODE:**

---

Доведи проект VendHub Manager до 100% Production Ready. Работай по плану из `docs/PROMPT_100_PERCENT_PRODUCTION.md`.

## ВАЖНО: ПРОЕКТ УЖЕ НА 85% ГОТОВ

Следующее **УЖЕ РЕАЛИЗОВАНО** (не трогай):
- ✅ UserRole (7 ролей) - `frontend/src/types/users.ts`
- ✅ Currency UZS - `frontend/src/lib/utils.ts`
- ✅ Grouped Sidebar - `frontend/src/components/layout/Sidebar.tsx`
- ✅ ExportButton - `frontend/src/components/ui/ExportButton.tsx`
- ✅ ProductTour - `frontend/src/components/ui/ProductTour.tsx`
- ✅ TaskListScreen (mobile) - с фильтрами, поиском, pull-to-refresh
- ✅ TaskDetailScreen (mobile) - полная реализация
- ✅ TaskCameraScreen (mobile) - камера с компрессией

## КРИТИЧЕСКИЕ ПРАВИЛА

1. **НЕ ОСТАНАВЛИВАЙСЯ** пока все 7 фаз не завершены
2. **ADDITIVE ONLY** - только добавляй, не удаляй существующий код
3. **ПРОВЕРЯЙ СНАЧАЛА** - перед изменением убедись что функционал не реализован
4. **TEST AFTER EACH CHANGE** - запускай `npm run build && npm run test`
5. **COMMIT ЧАСТО** - коммить каждую задачу

## ПОРЯДОК ФАЗ

```
ФАЗА 0: npm install во всех проектах, проверить build
ФАЗА 1: Mobile Offline Queue (единственное критичное отсутствующее)
ФАЗА 2: Backend тестирование (fix failing tests, 80% coverage)
ФАЗА 3: Frontend тестирование (build, lint)
ФАЗА 4: E2E тесты (Playwright)
ФАЗА 5: Security audit (npm audit, secrets check)
ФАЗА 6: Documentation (README, Swagger)
ФАЗА 7: Final validation
```

## CHECKPOINT ПОСЛЕ КАЖДОЙ ФАЗЫ

```bash
cd backend && npm run build && npm run test && npm run lint
cd ../frontend && npm run build && npm run lint
cd ../mobile && npm run lint
```

**ВСЁ ДОЛЖНО ПРОХОДИТЬ** перед переходом к следующей фазе.

## КРИТЕРИИ ЗАВЕРШЕНИЯ

- [ ] Backend билдится без ошибок
- [ ] Frontend билдится без ошибок
- [ ] Mobile проходит lint
- [ ] Backend тесты >= 80% coverage
- [ ] npm audit без high/critical
- [ ] Mobile offline queue работает
- [ ] Документация актуальна

## НАЧНИ СЕЙЧАС

1. `cd backend && npm install && npm run build`
2. `cd ../frontend && npm install && npm run build`
3. `cd ../mobile && npm install && npm run lint`
4. Читай `docs/PROMPT_100_PERCENT_PRODUCTION.md` для детальных инструкций
5. Работай по фазам пока ВСЕ критерии не выполнены

**НЕ ОСТАНАВЛИВАЙСЯ И НЕ СПРАШИВАЙ РАЗРЕШЕНИЯ. РАБОТАЙ АВТОНОМНО.**

---
