FROM node:20-alpine AS client-build

WORKDIR /client

ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_FRONTEND_URL
ARG VITE_API_URL
ARG ALLOWED_HOSTS

ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}
ENV VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV ALLOWED_HOSTS=${ALLOWED_HOSTS}

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-runtime

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./

# Frontend build output -> server/public (используется в server.js)
COPY --from=client-build /client/dist ./public

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
