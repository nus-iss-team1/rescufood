# ---- Dependencies (full, for the build) ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production dependencies only ----
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Migrations run from a developer machine, same as service/listings - no
# drizzle-kit or db/ folder needed in this image.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

USER node
EXPOSE 3003
ENV PORT=3003

CMD ["node", "dist/main"]
