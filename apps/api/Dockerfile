# syntax=docker/dockerfile:1.7

FROM node:20.19-alpine AS base
WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apk add --no-cache libc6-compat dumb-init \
  && corepack enable \
  && corepack prepare pnpm@10.30.3 --activate

FROM base AS deps
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS development
ENV NODE_ENV=development

COPY apps/api ./apps/api

USER node

CMD ["pnpm", "--filter", "api", "start:dev"]

FROM deps AS builder
ENV NODE_ENV=production

COPY . .

RUN pnpm --filter api build

RUN pnpm --filter api deploy --prod --legacy /prod/api

RUN mkdir -p /prod/api/public
RUN cp -r apps/api/dist /prod/api/dist

FROM base AS production
ENV NODE_ENV=production

RUN mkdir -p \
  /app/storage/public \
  /app/storage/private \
  /app/storage/avatars \
  && chown -R node:node /app

COPY --chown=node:node --from=builder /prod/api/package.json ./package.json
COPY --chown=node:node --from=builder /prod/api/node_modules ./node_modules
COPY --chown=node:node --from=builder /prod/api/dist ./dist
COPY --chown=node:node --from=builder /prod/api/public ./public

USER node

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
