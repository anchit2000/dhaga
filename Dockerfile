# Production image — see docs/DEPLOYING.md ("Production deployment with
# Docker") and docs/SELF_HOSTING.md. Multi-stage: deps → build → slim runtime
# carrying only Next's standalone output (server + traced node_modules).
#
# Debian (slim), not Alpine: onnxruntime-node and sharp ship glibc binaries.
#
# Runs in either DB mode:
#   - no DATABASE_URL  → embedded PGlite persisted at /data (volume it)
#   - DATABASE_URL set → hosted Postgres (required for DHAGA_HOSTED_MODE)

# ---- deps: workspace install, cached as its own layer -----------------------
FROM node:22-slim AS deps
WORKDIR /app

# Every workspace manifest must be present (they're all in the root lockfile,
# and `npm ci` refuses to run against a partial workspace tree), but only the
# web app's dependency subtree is actually installed.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ee/package.json packages/ee/package.json
RUN npm ci --workspace apps/web

# ---- build: next build with standalone output --------------------------------
# Based on deps (not a fresh image + COPY of root node_modules) because npm
# nests some packages under apps/web/node_modules rather than hoisting them;
# the whole installed tree must survive into this stage.
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1 \
    DHAGA_STANDALONE=1
COPY . .
RUN npm run build

# ---- runtime: standalone server only -----------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DHAGA_DATA_DIR=/data

# Standalone output is rooted at the repo root (outputFileTracingRoot), so the
# server entrypoint lands at apps/web/server.js.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

# Embedded-PGlite data dir (unused when DATABASE_URL is set). Mount a volume
# here or the database dies with the container.
RUN mkdir -p /data && chown node:node /data
VOLUME /data

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
