FROM oven/bun:1.3.11-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.ts ./
COPY template.pdf ./
EXPOSE 3000
CMD ["bun", "run", "server.ts"]
