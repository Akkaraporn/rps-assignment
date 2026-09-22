# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# ---------- base: Node + pnpm ----------
FROM node:${NODE_VERSION}-alpine AS base
RUN npm install -g pnpm@12.4.2
ENV CI=true
WORKDIR /repo

FROM base AS build
ARG APP

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/${APP}/package.json apps/${APP}/
RUN pnpm install --frozen-lockfile --filter "${APP}..."

COPY packages/shared packages/shared
COPY apps/${APP} apps/${APP}
RUN pnpm --filter @rps/shared build \
 && pnpm --filter "${APP}" build

RUN pnpm install --frozen-lockfile --prod --filter "${APP}..."

FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP
ENV NODE_ENV=production
WORKDIR /repo

COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /repo/apps/${APP}/package.json ./apps/${APP}/package.json
COPY --from=build --chown=node:node /repo/apps/${APP}/node_modules ./apps/${APP}/node_modules
COPY --from=build --chown=node:node /repo/apps/${APP}/dist ./apps/${APP}/dist

USER node
WORKDIR /repo/apps/${APP}
CMD ["node", "dist/main.js"]