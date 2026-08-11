# Build context is web/ so the linked sdk and ui packages are visible:
#   docker build -f platform/Dockerfile web

# ---- Dependencies ----
FROM node:25-alpine AS deps
WORKDIR /app/platform
COPY sdk /app/sdk
COPY listings-sdk /app/listings-sdk
COPY ui /app/ui
# The linked ui package resolves its own runtime deps from /app/ui.
RUN cd /app/ui && npm ci --omit=dev
COPY platform/package.json platform/package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:25-alpine AS builder
WORKDIR /app/platform
COPY --from=deps /app/sdk /app/sdk
COPY --from=deps /app/ui /app/ui
COPY --from=deps /app/platform/node_modules ./node_modules
COPY platform .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----
FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output mirrors the web/ workspace root, so the server
# lives under platform/.
COPY --from=builder --chown=nextjs:nodejs /app/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/platform/.next/static ./platform/.next/static
COPY --from=builder /app/platform/public ./platform/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "platform/server.js"]
