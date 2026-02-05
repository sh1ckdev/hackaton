FROM node:20-alpine

WORKDIR /app

# Копируем только файлы сервера
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Копируем остальные файлы сервера
COPY server/ .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
