FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer cache benefit)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output + source
COPY dist/ ./dist/
COPY watcher-state.json ./watcher-state.json 2>/dev/null || true
COPY watcher-dedup.json ./watcher-dedup.json 2>/dev/null || true
COPY watcher.ts ./watcher.ts

# Run as non-root
RUN addgroup -S liberty && adduser -S liberty -G liberty
USER liberty

ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/watcher/watcher.js"]
