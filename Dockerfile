FROM node:20-alpine

WORKDIR /app

# Устанавливаем PostgreSQL для запуска в этом же контейнере
RUN apk add --no-cache postgresql postgresql-client

# Копируем только файлы сервера
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Копируем остальные файлы сервера
COPY . .

ENV NODE_ENV=production

EXPOSE 3001

RUN chmod +x /app/docker-entrypoint.sh

CMD ["/app/docker-entrypoint.sh"]
