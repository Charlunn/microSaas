# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/main-landing/package.json apps/main-landing/package.json
COPY apps/demo-child/package.json apps/demo-child/package.json
COPY packages/core-sdk/package.json packages/core-sdk/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/ui-kit/package.json packages/ui-kit/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/main-landing apps/main-landing
COPY apps/demo-child apps/demo-child
COPY packages packages
COPY tsconfig.base.json tsconfig.base.json
RUN pnpm --filter main-landing build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/apps/main-landing/.next/standalone ./
COPY --from=builder /app/apps/main-landing/.next/static ./apps/main-landing/.next/static
RUN mkdir -p ./apps/main-landing/public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
