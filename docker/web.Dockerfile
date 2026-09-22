# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# ---------- build: สร้างไฟล์ static ----------
FROM node:${NODE_VERSION}-alpine AS build
RUN npm install -g pnpm@12.4.2
ENV CI=true
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter "web..."

COPY packages/shared packages/shared
COPY apps/web apps/web

ARG VITE_REVEAL_DURATION_MS=2000
ENV VITE_REVEAL_DURATION_MS=${VITE_REVEAL_DURATION_MS}

RUN pnpm --filter @rps/shared build \
 && pnpm --filter web build

# ---------- runtime: nginx เปล่า ๆ ----------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html