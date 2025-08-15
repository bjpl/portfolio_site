# Multi-stage build for production-ready portfolio site

# Stage 1: Hugo builder
FROM klakegg/hugo:0.111.3-ext-alpine AS hugo-builder

WORKDIR /app

# Copy Hugo site files
COPY config.yaml config.toml ./
COPY archetypes ./archetypes
COPY content ./content
COPY data ./data
COPY layouts ./layouts
COPY static ./static
COPY assets ./assets
COPY config ./config

# Build Hugo site
RUN hugo --minify --environment production

# Stage 2: Node.js backend builder
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/src ./src

# Stage 3: Frontend assets builder
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
COPY vite.config.js ./
COPY tsconfig.json ./

# Build frontend assets
RUN npm run build

# Stage 4: Production image
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tini \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

WORKDIR /app

# Copy Hugo output
COPY --from=hugo-builder --chown=node:node /app/public ./public

# Copy backend
COPY --from=backend-builder --chown=node:node /app/backend ./backend

# Copy frontend build
COPY --from=frontend-builder --chown=node:node /app/dist ./public/dist

# Copy static files and admin
COPY --chown=node:node static ./static

# Create necessary directories
RUN mkdir -p logs uploads temp && \
    chown -R node:node logs uploads temp

# Environment variables
ENV NODE_ENV=production \
    PORT=3333 \
    HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Use non-root user
USER node

# Expose port
EXPOSE 3333

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "backend/src/server.js"]