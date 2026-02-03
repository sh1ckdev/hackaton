# Многоэтапная сборка для production
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Передаем переменные окружения для сборки
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_FRONTEND_URL
ARG VITE_API_URL
ARG ALLOWED_HOSTS

ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_API_URL=$VITE_API_URL
ENV ALLOWED_HOSTS=$ALLOWED_HOSTS

# Собираем приложение
RUN npm run build

# Production образ
FROM nginx:alpine

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx (если есть)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Настраиваем nginx для SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
