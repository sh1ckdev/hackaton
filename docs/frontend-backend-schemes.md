# Как фронт и бэк общаются (простыми словами)

Ниже схемы для объяснения школьникам: что происходит, когда пользователь нажимает кнопки на сайте.

## 1) Вход в систему

```mermaid
sequenceDiagram
    participant U as Ученик/Пользователь
    participant F as Frontend (React)
    participant B as Backend (Express API)
    participant VK as VK/Telegram
    participant DB as PostgreSQL

    U->>F: Нажимает "Войти"
    F->>VK: Запрос авторизации
    VK-->>F: code/state или telegramData
    F->>B: POST /api/auth/vk или /api/auth/telegram
    B->>VK: Проверяет данные входа
    B->>DB: Ищет/создает пользователя
    DB-->>B: user
    B-->>F: token + refresh_token + user
    F-->>U: Пользователь авторизован
```

Коротко:
- фронт не "доверяет сам себе", он всегда просит бэк подтвердить вход;
- бэк проверяет внешние сервисы (VK/Telegram) и только потом выдает JWT.

## 2) Получение данных (например, кейсов)

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    U->>F: Открывает страницу кейсов
    F->>B: GET /api/cases
    B->>DB: SELECT * FROM cases
    DB-->>B: Список кейсов
    B-->>F: JSON { cases: [...] }
    F-->>U: Показывает карточки кейсов
```

## 3) Защищенный запрос (профиль, команда, админка)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    F->>B: PUT /api/profile/bio + Bearer token
    B->>B: Проверка JWT (middleware auth)
    alt Токен валидный
        B->>DB: UPDATE users ...
        DB-->>B: Обновленные данные
        B-->>F: 200 OK + user
    else Токен невалидный/просрочен
        B-->>F: 401/403 ошибка
    end
```

## 4) Когда токен истекает

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    F->>B: POST /api/auth/refresh
    B->>DB: Проверка refresh token
    alt Refresh валидный
        B->>DB: Отзывает старый refresh, создает новый
        B-->>F: Новый token + refresh_token
    else Невалидный
        B-->>F: 400/404
    end
```

## 5) Отправка решения командой

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant S3 as S3/Файловое хранилище
    participant DB as PostgreSQL

    F->>B: POST /api/solutions (multipart/form-data)
    B->>B: Проверка токена + проверка команды
    B->>S3: Загрузка презентации (если есть)
    S3-->>B: URL файла
    B->>DB: INSERT/UPDATE solutions
    DB-->>B: solution
    B-->>F: 201 + solution
```

## 6) Поддержка (чат с пользователем)

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL
    participant TG as Telegram (группа поддержки)

    U->>F: Пишет сообщение в поддержку
    F->>B: POST /api/support/message
    B->>DB: Сохраняет ticket и message
    B->>TG: Отправляет копию в Telegram
    B-->>F: Подтверждение
    F-->>U: Сообщение отправлено
```

## Главная идея для школьников

- `Frontend` — это "красивый интерфейс и кнопки".
- `Backend` — это "мозг и правила безопасности".
- `Database` — это "память проекта".
- Пользователь видит только фронт, но все важные проверки делает бэк.
