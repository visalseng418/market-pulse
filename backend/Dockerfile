# Stage 1 — Build
# Context is the project root so both backend/ and shared/ are available.
# tsconfig.build.json sets rootDir: ".." so TypeScript sees both trees.
FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend/ ./backend/
RUN cd backend && npx tsc -p tsconfig.build.json

# Stage 2 — Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/tsconfig.production.json ./tsconfig.json
# Required for db:migrate — drizzle-kit needs the config, migrations, and schema
COPY backend/drizzle.config.ts ./
COPY backend/database/ ./database/
COPY backend/src/config/schema.ts ./src/config/schema.ts
EXPOSE 5000
CMD ["node", "-r", "tsconfig-paths/register", "dist/backend/src/server.js"]
