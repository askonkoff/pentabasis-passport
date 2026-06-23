# Пентабазис · Паспорт проекта

Заполняемый паспорт проекта по методике «Пентабазис 5+1» (РИМ) с **облачным сохранением**: заполнил → получил ссылку → поделился. Кто откроет ссылку — видит и редактирует паспорт.

## Как устроено

- **Фронтенд** — одностраничная форма `index.html` (без сборки).
- **Бэкенд** — serverless-функции Vercel в `api/`:
  - `POST /api/passport` — создать паспорт, вернуть `{ id, edit_token }`
  - `GET  /api/passport/:id` — прочитать
  - `PUT  /api/passport/:id` — сохранить изменения
- **БД** — Postgres (Neon через Vercel Storage), одна таблица `passports`. Без `DATABASE_URL` бэкенд работает на in-memory сторе (для локального запуска).
- **Приватность** — `id` неугадываемый (128-бит). Публичного списка нет, ссылку не подобрать.
- **Доступ (v1)** — со ссылкой можно смотреть и править. `edit_token` уже сохраняется в БД — позже включим раскатку на «индивидуальные паспорта» (правка только по токену владельца) без миграции и без слома ссылок.

## Локальный запуск

```bash
npm install
npm run dev          # http://localhost:3000  (in-memory, без БД)
```

С реальной БД локально:

```bash
DATABASE_URL='postgres://…' npm run dev
```

## Деплой (Vercel + Postgres)

1. Vercel → **Add New → Project** → импортировать репозиторий `askonkoff/pentabasis-passport`.
2. В проекте **Storage → Create Database → Postgres (Neon)** → привязать к проекту. Vercel сам добавит переменную окружения с connection string (`DATABASE_URL` / `POSTGRES_URL`).
3. **Redeploy**. Таблица `passports` создаётся автоматически при первом запросе.

Кастомный домен — по желанию в Settings → Domains.

## Структура

```
index.html              форма + клиентская логика
api/passport/index.js   POST  — создать
api/passport/[id].js    GET/PUT — прочитать / сохранить
api/_store.js           Postgres | in-memory
scripts/dev-server.mjs  локальный сервер (использует те же handlers)
vercel.json             rewrite /p/:id → index.html
```
