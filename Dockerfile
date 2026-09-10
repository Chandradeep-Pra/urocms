# syntax=docker/dockerfile:1.7

FROM node:24.11.0-bookworm-slim AS base
RUN npm install --global npm@11.18.0

FROM base AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Only public browser configuration belongs in build arguments. Server secrets
# must be injected into Cloud Run at runtime through Secret Manager.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_USER_APP_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS
RUN npm run build

FROM node:24.11.0-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
