# ============================================
# EpicServer License Server - Dockerfile (Fly.io)
# ============================================
# Stage 1: Build stage (install native dependencies)
FROM node:20-alpine AS builder

# Install build tools required for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for building)
COPY package.json package-lock.json ./
RUN npm ci --only=production 2>&1 || npm install --only=production

# Stage 2: Production image (minimal)
FROM node:20-alpine AS production

# Install only runtime dependencies (better-sqlite3 needs these at runtime)
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy node_modules from builder (includes better-sqlite3 native binary)
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY server.js package.json start.sh ./
COPY config.json ./
COPY public ./public

# Create data directory for persistent SQLite database
RUN mkdir -p /data && chown -R node:node /data /app

# Switch to non-root user for security
USER node

# Expose port (Fly.io will map external 443 to this internal port)
EXPOSE 8080

# Environment variables are set via Fly.io secrets or fly.toml
ENV PORT=8080 \
    DB_PATH=/data/licenses.db \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the server
CMD ["node", "server.js"]