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
| make / model | string | Марка и модель (обязательны) |
| year | int? | Год |
| color | string? | Цвет |
| nickname | string? | Своё имя, например «рабочая» |

### `ServiceRecord`
Запись обслуживания: план (`planned`) или выполненное ТО (`completed`).

| Поле | Тип | Описание |
|------|-----|----------|
| carId | string | Машина |
| status | `planned` \| `completed` | По умолчанию у старых записей — `completed` |
| title | string | Название работ |
| recommendedMileage | int? | Рекомендованный пробег (обязателен для плана) |
| performedAt | datetime? | Дата (обязательна для `completed`) |
| mileage | int? | Фактический пробег (обязателен для `completed`) |
| cost | decimal? | Стоимость (обязательна для `completed`) |
| workshop | string? | Сервис / СТО |
| category | string? | Например `oil`, `tires`, `repair` |
| notes | string? | Комментарий |

### `CarPhoto`
Фото конкретной машины. Файл лежит в `uploads/cars/:carId/`, в API отдаётся `url`.

| Поле | Тип | Описание |
|------|-----|----------|
| carId | string | Машина |
| filename | string | Имя файла на диске |
| originalName | string? | Исходное имя |
| mimeType | string | Например `image/jpeg` |
| size | int | Размер в байтах |
| caption | string? | Подпись |

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
| POST | `/cars` | JWT | Добавить машину `{ make, model, vin?, year?, color?, nickname? }` → `{ car }` с `id`, `userId` и полями |
| GET | `/cars/:id` | JWT | Одна машина |
| PATCH | `/cars/:id` | JWT | Обновить |
| DELETE | `/cars/:id` | JWT | Удалить |

### Services (история обслуживания)

Вложены в машину. Доступ только к своим `carId`.

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/cars/:carId/services?status=all\|planned\|completed` | JWT | Список + `totalCost` / `latestMileage` только по `completed` |
| POST | `/cars/:carId/services` | JWT | План или сразу выполненное (см. ниже) |
| GET | `/cars/:carId/services/:serviceId` | JWT | Одна запись |
| PATCH | `/cars/:carId/services/:serviceId` | JWT | Обновить / закрыть план (`status: completed` + факт. поля) |
| DELETE | `/cars/:carId/services/:serviceId` | JWT | Удалить |

План: `{ "status": "planned", "title": "Замена масла", "recommendedMileage": 95000 }`  
Выполнено: `{ "status": "completed", "title": "...", "mileage": 94800, "cost": 8200, "performedAt": "2026-11-15", "recommendedMileage": 95000 }`  
Закрыть план: `PATCH` `{ "status": "completed", "mileage": 94800, "cost": 8200, "performedAt": "2026-11-15" }`

### Photos

Вложены в машину. Загрузка — `multipart/form-data`, поле файла `photo`.

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/cars/:carId/photos` | JWT | `{ photos: [{ id, url, caption, ... }], count }` |
| POST | `/cars/:carId/photos` | JWT | Загрузить фото (+ опционально `caption`) |
| GET | `/cars/:carId/photos/:photoId` | JWT | Одна фото (метаданные + `url`) |
| PATCH | `/cars/:carId/photos/:photoId` | JWT | Обновить `caption` |
| DELETE | `/cars/:carId/photos/:photoId` | JWT | Удалить |

Сами файлы: `GET http://localhost:8080/uploads/cars/:carId/:filename` (публичный URL из ответа).

### Catalog

- Марки/модели: [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api)
- Декод VIN: [Auto.dev](https://docs.auto.dev/v2/products/vin-decode) (`AUTODEV_API_KEY` в `.env`)

Ответы кешируются в `VehicleCache`.

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/catalog/makes` | JWT | Марки |
| GET | `/catalog/models?make=toyota` | JWT | Модели марки |
| GET | `/catalog/decode/:vin` | JWT | Расшифровка VIN (make/model/year/engine/trim…) |

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
