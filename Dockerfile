FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.34.4 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.34.4 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:local

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.34.4 --activate

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app .

EXPOSE 3000
CMD ["pnpm", "start"]
