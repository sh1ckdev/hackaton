FROM node:20-alpine

WORKDIR /app

# Копируем только файлы сервера
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Копируем остальные файлы сервера
COPY . .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
