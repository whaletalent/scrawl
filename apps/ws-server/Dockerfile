# Build from the repository root (the lockfile lives there):
#   docker build -f apps/ws-server/Dockerfile -t scrawl-ws .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/ws-server/package.json apps/ws-server/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=@scrawl/ws-server
COPY apps/ws-server apps/ws-server
RUN npm run build --workspace=@scrawl/ws-server

FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/ws-server/package.json apps/ws-server/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace=@scrawl/ws-server && npm cache clean --force
COPY --from=build /app/apps/ws-server/dist apps/ws-server/dist
USER node
EXPOSE 8080
CMD ["node", "apps/ws-server/dist/server.js"]
