# Celestia Wish — Cases + Battle + Upgrade

Неофициальный фан-сайт открытия кейсов в тематике Genshin Impact:
соло-Wish, Case Battle (Highest) и апгрейд редкости (trade-up).

## Стек

- **Frontend:** React + TypeScript + Vite → деплой на **Vercel**
- **API:** Express + Prisma → деплой на **Railway**
- **БД:** PostgreSQL (Railway)
- State: Zustand. Анимации: CSS + Framer Motion.

Аккаунты, баланс, инвентарь, **пополнения** и **поддержка** хранятся на сервере.

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
   - `PUBLIC_APP_URL` — тот же URL фронта (для return_url ЮKassa)
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` — из кабинета ЮKassa
   - `DEMO_PAYMENTS=false` на проде (с ЮKassa)
5. Generate domain у API-сервиса → скопируй URL (`https://….up.railway.app`).
6. В [кабинете ЮKassa](https://yookassa.ru/my) → HTTP-уведомления:
   URL `https://….up.railway.app/api/payments/webhook`, событие `payment.succeeded`.
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
| POST | `/api/topups` | Создать пополнение → `confirmationUrl` (ЮKassa) или демо |
| GET | `/api/topups/:id` | Статус + sync с ЮKassa после return |
| POST | `/api/topups/:id/confirm-demo` | Демо-оплата (только без ключей ЮKassa) |
| POST | `/api/payments/webhook` | HTTP-уведомления ЮKassa → `paid` + баланс |
| GET/PATCH | `/api/admin/users…` | Админка |
| GET | `/api/support/tickets` | Свои обращения; админ видит все |
| POST | `/api/support/tickets` | Новое обращение |
| POST | `/api/support/tickets/:id/messages` | Ответ в обращении |
| PATCH | `/api/support/tickets/:id` | Статус (только админ) |

## Где менять данные игры

| Что | Где |
|-----|-----|
| Кейсы / предметы / шансы / цены | `src/features/cases/data/cases.ts` |
| Цвета редкостей | `src/features/cases/data/rarities.ts` |
| Правила апгрейда | `src/features/upgrade/config.ts` |

## Поддержка

Обращения хранятся в Postgres (`SupportTicket` / `SupportMessage`).
Клиент пишет через кнопку **Поддержка**, админ отвечает во вкладке **Поддержка**.
На Railway таблицы создаются при старте (`prisma db push`).

## Платежи (ЮKassa)

1. Заведи магазин на [yookassa.ru](https://yookassa.ru) (можно тестовый режим).
2. Войди как admin → вкладка **ЮKassa** → укажи shopId, секретный ключ и URL сайта.
   (либо те же значения в `server/.env` — админка имеет приоритет.)
3. На проде: `DEMO_PAYMENTS=false`.
4. В кабинете ЮKassa укажи webhook: `https://<api>/api/payments/webhook`.

Курс: **1 Мора = 1 ₽**. Пополнение → редирект на ЮKassa → webhook (или sync при возврате) зачисляет баланс.
