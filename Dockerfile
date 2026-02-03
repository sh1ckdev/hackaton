FROM node:20-alpine AS build

WORKDIR /app

# Build args для переменных окружения Vite
ARG VITE_TELEGRAM_BOT_USERNAME=
ARG VITE_TURNSTILE_SITE_KEY=
ARG VITE_FRONTEND_URL=
ARG VITE_API_URL=http://localhost:5000/api

# Vite требует, чтобы переменные окружения были доступны во время сборки
ENV VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME}
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .

# Выводим значения для отладки
RUN echo "=== Building with environment variables ===" && \
    echo "VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME" && \
    echo "VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY:-(empty)}" && \
    echo "VITE_FRONTEND_URL=$VITE_FRONTEND_URL" && \
    echo "VITE_API_URL=$VITE_API_URL" && \
    echo "============================================"

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

# Copy application source, build output and dependencies
COPY --from=build /app /app

ENV NODE_ENV=production

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
