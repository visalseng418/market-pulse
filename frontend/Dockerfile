# Stage 1 — Build
# Context is the project root so both frontend/ and shared/ are available
FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2 — Serve
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
