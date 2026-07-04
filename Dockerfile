# Self-host image — see docs/SELF_HOSTING.md. Single stage on purpose:
# packages/* ship raw TypeScript that Next transpiles at build, and the
# native runtime deps (sharp, onnxruntime-node) must be present in
# node_modules at runtime, so the build tree is the runtime tree.
# Debian (slim), not Alpine: onnxruntime-node ships glibc binaries only.
FROM node:22-slim

WORKDIR /app

# Workspace manifests first so `npm ci` caches as its own layer.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ee/package.json packages/ee/package.json
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
