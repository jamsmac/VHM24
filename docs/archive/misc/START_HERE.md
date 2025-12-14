# 🚀 VendHub Manager - Quick Start Guide

## ✅ Все готово к запуску!

### 🎯 Запуск одной командой:

```bash
./launch.sh
```

Эта команда автоматически:
1. ✅ Проверит все зависимости
2. ✅ Запустит базу данных PostgreSQL
3. ✅ Запустит Redis для кеша
4. ✅ Запустит MinIO для файлов
5. ✅ Создаст супер-админа
6. ✅ Запустит backend и frontend
7. ✅ Настроит Telegram бота

---

## 📱 Ваши данные:

### Telegram Bot
- **Token:** `8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA`
- **Admin:** @Jamshiddin (ID: 42283329)

### Super Admin Account
- **Email:** admin@vendhub.com
- **Password:** VendHub2024!
- **Telegram:** @Jamshiddin

---

## 🌐 Доступ к системе:

После запуска система будет доступна по адресам:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs
- **MinIO Console:** http://localhost:9001

---

## ☁️ Развертывание в облаке (БЕСПЛАТНО):

### Вариант 1: Быстрый деплой на бесплатные сервисы

```bash
./quick-deploy.sh
```

### Вариант 2: Ручная настройка

1. **База данных** - Supabase (бесплатно)
   - Зайти на https://supabase.com
   - Создать проект
   - Скопировать DATABASE_URL

2. **Redis** - Upstash (бесплатно)
   - Зайти на https://upstash.com
   - Создать базу
   - Скопировать REDIS_URL

3. **Backend** - Railway ($5 бесплатно)
   - Зайти на https://railway.app
   - Подключить GitHub
   - Выбрать папку backend
   - Добавить переменные окружения

4. **Frontend** - Vercel (бесплатно)
   - Зайти на https://vercel.com
   - Импортировать репозиторий
   - Выбрать папку frontend

---

## 🐳 Docker Production:

```bash
# Запуск в production режиме
docker-compose -f docker-compose.production.yml up -d
```

---

## 📚 Структура проекта:

```
VendHub/
├── backend/           # NestJS API
├── frontend/          # Next.js UI
├── launch.sh          # 🚀 Запуск одной командой
├── quick-deploy.sh    # ☁️ Деплой в облако
├── deploy.sh          # 🔧 Production деплой
└── docker-compose.yml # 🐳 Docker конфигурация
```

---

## ❓ Проблемы?

### Docker не установлен
```bash
# macOS
brew install docker docker-compose

# Linux
sudo apt-get install docker.io docker-compose

# Windows
# Скачать Docker Desktop: https://www.docker.com/products/docker-desktop
```

### Node.js не установлен
```bash
# macOS
brew install node@18

# Linux
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install nodejs

# Windows
# Скачать с https://nodejs.org
```

---

## 📞 Telegram Bot Commands:

После запуска, откройте Telegram и найдите вашего бота:
1. Найти бота: @YourBotName
2. Нажать /start
3. Войти как админ

---

## 🎉 Готово!

Система полностью настроена и готова к работе!

Просто запустите:
```bash
./launch.sh
```

И откройте в браузере:
**http://localhost:3001**

---

**Удачной работы с VendHub Manager! 🚀**
