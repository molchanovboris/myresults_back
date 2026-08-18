# myresults_back

API для приложения My Results: вход по коду с почты, гараж автомобилей, прокси к каталогу машин.

Face ID живёт только на iPhone. Бэкенд выдаёт JWT; телефон хранит его в Keychain и разблокирует через Face ID.

## Схема таблиц

### `User`
Аккаунт. Создаётся при первой успешной проверке кода с почты.

| Поле | Тип | Описание |
|------|-----|----------|
| id | cuid | |
| email | string, unique | Логин |
| name | string? | Имя, можно заполнить позже |
| createdAt / updatedAt | datetime | |

### `AuthCode`
Одноразовый код из письма. Хранится **хеш**, не сам код.

| Поле | Тип | Описание |
|------|-----|----------|
| email | string | Кому отправили код |
| codeHash | string | Хеш кода |
| expiresAt | datetime | Обычно +10 минут |
| usedAt | datetime? | Когда код уже использовали |
| userId | string? | Если пользователь уже есть |

Повторный запрос кода инвалидирует предыдущие неиспользованные коды на этот email.

### `Car`
Машины пользователя (гараж).

| Поле | Тип | Описание |
|------|-----|----------|
| userId | string | Владелец |
| vin | string? | VIN, если есть |
| make / model / year | | Марка, модель, год |
| nickname | string? | Своё имя, например «рабочая» |

### `VehicleCache`
Кеш ответов NHTSA, чтобы не дёргать внешний API на каждый запрос.

| Поле | Тип | Описание |
|------|-----|----------|
| key | string, unique | Например `makes`, `models:toyota`, `vin:1HGCM...` |
| source | string | `nhtsa` |
| payload | json | Ответ API |
| fetchedAt | datetime | Когда обновили |

## API

Все ответы — JSON. Защищённые роуты: заголовок `Authorization: Bearer <jwt>`.

### Auth

| Метод | Путь | Auth | Тело / ответ |
|-------|------|------|----------------|
| POST | `/auth/request-code` | нет | `{ email }` → `{ ok: true }` |
| POST | `/auth/verify-code` | нет | `{ email, code }` → `{ token, user }` |
| GET | `/auth/me` | JWT | текущий пользователь |

`request-code`: генерирует 6-значный код, пишет хеш в `AuthCode`, шлёт письмо.

`verify-code`: проверяет код и срок, создаёт `User` если его ещё нет, возвращает JWT.

### Cars

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/cars` | JWT | Список машин пользователя |
| POST | `/cars` | JWT | Добавить машину `{ vin?, make, model, year?, nickname? }` |
| GET | `/cars/:id` | JWT | Одна машина |
| PATCH | `/cars/:id` | JWT | Обновить |
| DELETE | `/cars/:id` | JWT | Удалить |

### Catalog (NHTSA)

Бэкенд ходит в [vPIC](https://vpic.nhtsa.dot.gov/api), кладёт ответ в `VehicleCache`, отдаёт фронту уже свой JSON.

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/catalog/makes` | JWT | Марки |
| GET | `/catalog/models?make=toyota` | JWT | Модели марки |
| GET | `/catalog/decode/:vin` | JWT | Расшифровка VIN |

## Поток входа

1. Пользователь вводит email → `POST /auth/request-code`.
2. Код приходит на почту → `POST /auth/verify-code` → JWT.
3. Фронт кладёт JWT в Secure Store.
4. Следующий вход на iPhone: Face ID разблокирует JWT, запросы идут с `Authorization: Bearer`.
5. Новый телефон / нет Face ID: снова код на почту.

## Стек

Express + TypeScript + Prisma + PostgreSQL + JWT + Resend (письма).

## Запуск

1. Поднять Postgres:

```bash
docker compose up -d
```

2. Установить зависимости и применить миграцию:

```bash
npm install
npx prisma migrate dev --name init
```

3. Запустить API:

```bash
npm run dev
```

Сервер слушает `http://localhost:3000`. Проверка: `GET /health`.

Пока `RESEND_API_KEY` пустой, код входа печатается в консоль сервера, письмо не уходит.
