# Пентабазис · Паспорт проекта

Заполняемый паспорт проекта по методике «Пентабазис 5+1» (РИМ) с **облачным сохранением**: заполнил → получил ссылку → поделился. Кто откроет ссылку — видит и редактирует паспорт.

## Как устроено

- **Фронтенд** — одностраничная форма `index.html` (без сборки).
- **Сервер** — `server.mjs` (обычный Node-процесс) отдаёт форму и маршрутизирует API:
  - `POST /api/passport` — создать паспорт, вернуть `{ id, edit_token }`
  - `GET  /api/passport/:id` — прочитать
  - `PUT  /api/passport/:id` — сохранить изменения
- Логика API живёт в `api/passport/*` — её используют и `server.mjs` (Railway), и serverless-функции (Vercel), если понадобится.
- **БД** — Postgres. Подключение через `DATABASE_URL`. Без него сервер работает на in-memory сторе (для локального запуска).
- **Приватность** — `id` неугадываемый (128-бит). Публичного списка нет, ссылку не подобрать.
- **Доступ (v1)** — со ссылкой можно смотреть и править. `edit_token` уже сохраняется в БД — позже включим раскатку на «индивидуальные паспорта» (правка только по токену владельца) без миграции и без слома ссылок.

## Локальный запуск

```bash
npm install
npm run dev          # http://localhost:3000  (in-memory, без БД)

# с реальной БД:
DATABASE_URL='postgres://…' npm run dev
```

## Деплой на Railway

1. Railway → **New → Deploy from GitHub repo** → `askonkoff/pentabasis-passport`.
2. В проект добавить **New → Database → PostgreSQL**.
3. В сервисе приложения переменная `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (ссылка на сервис Postgres) → **Redeploy**.
4. **Settings → Networking → Generate Domain** — публичный адрес.

Railway сам ставит зависимости и запускает `npm start` (`node server.mjs`). Таблица `passports` создаётся автоматически при первом запросе.

## Структура

```
index.html              форма + клиентская логика
server.mjs              Node-сервер (Railway / локально)
api/passport/index.js   POST  — создать
api/passport/[id].js    GET/PUT — прочитать / сохранить
api/_store.js           Postgres | in-memory
vercel.json             rewrite /p/:id (если деплоить на Vercel)
```
