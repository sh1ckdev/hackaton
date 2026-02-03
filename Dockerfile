FROM node:20-alpine AS build

WORKDIR /app

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

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

# Copy application source, build output and dependencies
COPY --from=build /app /app

ENV NODE_ENV=production

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
