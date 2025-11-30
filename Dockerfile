# Base image with Node 20
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat


# Install dependencies (dev)
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install


# Build Next.js
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# Production runtime layer
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy build artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/app/lib ./app/lib

RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app/public

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
