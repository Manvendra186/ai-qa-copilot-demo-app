# Demo app under test (build bible §23/§31.8) — single image serving the
# Express API + built React client. For the S3.1 compose service; NOT yet
# build-verified in S0.10.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json server/
COPY client/package.json client/
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter demo-client build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
EXPOSE 4000
CMD ["node", "server/src/index.js"]
