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

ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

EXPOSE 4173

# Используем явную команду для preview сервера
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
