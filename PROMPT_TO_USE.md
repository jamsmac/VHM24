# PROMPT: VendHub Manager → 100% Production Ready

**СКОПИРУЙ ЭТОТ ТЕКСТ И ВСТАВЬ В НОВУЮ СЕССИЮ CLAUDE CODE:**

---

Доведи проект VendHub Manager до 100% Production Ready состояния. Работай по плану из `docs/PROMPT_100_PERCENT_PRODUCTION.md`.

## КРИТИЧЕСКИЕ ПРАВИЛА

1. **НИКОГДА НЕ ОСТАНАВЛИВАЙСЯ** пока все 10 фаз не завершены
2. **ADDITIVE ONLY** - только добавляй код, не удаляй существующий без явной причины
3. **TEST AFTER EACH CHANGE** - после каждого изменения запускай `npm run build && npm run test`
4. **COMMIT ЧАСТО** - коммить каждую задачу отдельно с conventional commits
5. **ВАЛИДИРУЙ** - после каждой фазы проверяй что ничего не сломалось
6. **НЕ СПРАШИВАЙ** - если что-то непонятно, принимай разумное решение и продолжай

## ПОРЯДОК ФАЗ (выполняй строго последовательно)

```
ФАЗА 0: Подготовка → git checkout -b feature/production-ready, проверь что всё билдится
ФАЗА 1: Blockers → Role mismatch (7 ролей), Currency RUB→UZS, sync types
ФАЗА 2: Backend → fix tests, add validations, guards, rate limiting, indexes
ФАЗА 3: Frontend → Grouped Sidebar, ExportButton, ProductTour, responsive forms
ФАЗА 4: Mobile → TaskList, TaskDetail, Camera, Offline Queue, Push, GPS
ФАЗА 5: Telegram → commission commands, enhanced tasks, manager commands
ФАЗА 6: Testing → 80% backend coverage, 70% frontend, E2E tests
ФАЗА 7: Security → npm audit fix, remove secrets, CORS, Helmet
ФАЗА 8: Performance → query optimization, caching, bundle size
ФАЗА 9: Documentation → CLAUDE.md, Swagger, User Guide RU
ФАЗА 10: Validation → full system test, load test, release
```

## CHECKPOINT ПОСЛЕ КАЖДОЙ ФАЗЫ

После завершения КАЖДОЙ фазы выполни:

```bash
cd backend && npm run build && npm run test && npm run lint
cd ../frontend && npm run build && npm run lint
cd ../mobile && npm run lint
```

**ВСЁ ДОЛЖНО ПРОХОДИТЬ БЕЗ ОШИБОК** прежде чем переходить к следующей фазе.

Обновляй прогресс в `docs/PRODUCTION_PROGRESS.md` после каждой фазы.

## КРИТЕРИИ ЗАВЕРШЕНИЯ (все должны быть выполнены)

- [ ] Все build проходят без ошибок
- [ ] Все тесты проходят (backend: 80%+, frontend: 70%+)
- [ ] `npm audit` без high/critical уязвимостей
- [ ] Manual QA: login, CRUD, tasks, photos, reports, telegram
- [ ] Документация обновлена
- [ ] Финальный коммит и push

## НАЧНИ СЕЙЧАС

1. Прочитай `docs/PROMPT_100_PERCENT_PRODUCTION.md` для детальных инструкций
2. Создай ветку `feature/production-ready-YYYYMMDD`
3. Создай файл `docs/PRODUCTION_PROGRESS.md` для отслеживания прогресса
4. Начни с ФАЗЫ 0: проверь что всё билдится
5. Продолжай по фазам пока ВСЕ критерии не выполнены

**ВАЖНО: Не останавливайся и не спрашивай разрешения. Работай автономно до полного завершения.**

---

