# Celestia Wish — Cases + Battle + Upgrade

Неофициальный фан-сайт открытия кейсов в тематике Genshin Impact:
соло-Wish, Case Battle (Highest) и апгрейд редкости (trade-up).

## Стек

- **Frontend:** React + TypeScript + Vite → деплой на **Vercel**
- **API:** Express + Prisma → деплой на **Railway**
- **БД:** PostgreSQL (Railway)
- State: Zustand. Анимации: CSS + Framer Motion.

Аккаунты, баланс, инвентарь и **пополнения** хранятся на сервере.

## Локальный запуск

БД — **SQLite** (файл `server/prisma/dev.db`), Postgres/Docker не нужны.

### 1. API

```bash
cd server
cp .env.example .env   # если ещё нет
npm install
npx prisma db push
npm run dev
```

API: http://localhost:3010 · health: http://localhost:3010/api/health

### 2. Frontend (второй терминал)

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:3010
npm install
npm run dev
```

Сайт: http://localhost:5173

Админ: `admin` / `admin123`. Пополнение: кнопка **+** в шапке.

> Порт **3010**, потому что 3001 часто занят другими приложениями (например Dolphin).

## Деплой Vercel + Railway

### Railway (API + Postgres)

1. Залей репозиторий на GitHub.
2. [railway.app](https://railway.app) → New Project → **PostgreSQL**.
3. Add service → **GitHub Repo** → Root Directory: `server`.
4. Variables:
   - `DATABASE_URL` — из Postgres plugin (Railway подставит)
   - `JWT_SECRET` — длинная случайная строка
   - `CORS_ORIGIN` — URL Vercel, например `https://your-app.vercel.app`
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `DEMO_PAYMENTS=true` (пока без ЮKassa)
5. Generate domain у API-сервиса → скопируй URL (`https://….up.railway.app`).

### Vercel (фронт)

1. [vercel.com](https://vercel.com) → Import GitHub repo (корень проекта, не `server`).
2. Environment Variable: `VITE_API_URL` = Railway URL **без** `/` в конце.
3. Deploy.

После смены `VITE_API_URL` нужен редеплой фронта.

### Свой домен

- Vercel → Project → Domains
- Railway → Settings → Domains (опционально для API, например `api.example.com`)
- Обнови `CORS_ORIGIN` и `VITE_API_URL`

## Структура

```
src/features/   — UI (cases, battles, upgrade, auth, admin)
server/         — Express API + Prisma schema
public/         — картинки кейсов/предметов
```

## API (кратко)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход → JWT |
| GET | `/api/auth/me` | Текущий пользователь |
| PATCH | `/api/me/economy` | Синхрон баланса/инвентаря |
| POST | `/api/topups` | Создать пополнение (`pending`) |
| POST | `/api/topups/:id/confirm-demo` | Демо-оплата → `paid` + баланс |
| POST | `/api/payments/webhook` | Заготовка под платёжку |
| GET/PATCH | `/api/admin/users…` | Админка |

## Где менять данные игры

| Что | Где |
|-----|-----|
| Кейсы / предметы / шансы / цены | `src/features/cases/data/cases.ts` |
| Цвета редкостей | `src/features/cases/data/rarities.ts` |
| Правила апгрейда | `src/features/upgrade/config.ts` |

## Поддержка

Тикеты поддержки пока в `localStorage` (`a34-support`) — не общая серверная база.
Auth и баланс уже на сервере.

## Дальше (платежи)

Заменить `confirm-demo` на ЮKassa/Stripe: создать платёж в `POST /api/topups`, редирект на оплату, зачисление только из `POST /api/payments/webhook` с проверкой подписи. На проде поставь `DEMO_PAYMENTS=false`.
