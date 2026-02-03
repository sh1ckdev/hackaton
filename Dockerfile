FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build args для переменных окружения Vite
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_FRONTEND_URL
ARG VITE_API_URL

# Vite требует, чтобы переменные окружения были доступны во время сборки
# Используем ENV для передачи в процесс сборки
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_API_URL=$VITE_API_URL

# Выводим значения для отладки
RUN echo "=== Building with environment variables ===" && \
    echo "VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME" && \
    echo "VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY:-(empty)}" && \
    echo "VITE_FRONTEND_URL=$VITE_FRONTEND_URL" && \
    echo "VITE_API_URL=$VITE_API_URL" && \
    echo "============================================"

RUN npm run build

EXPOSE 4173

# Используем явную команду для preview сервера
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
