FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
RUN bun install --frozen-lockfile

COPY client ./client
COPY server ./server

RUN bun run build:web

FROM oven/bun:1 AS runtime

WORKDIR /app

COPY server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/client/public ./client/public

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_DIST=/app/client/dist

EXPOSE 3000

CMD ["bun", "server/src/index.ts"]
