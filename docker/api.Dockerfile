FROM node:20.19-alpine AS dependencies
WORKDIR /app
ENV PYTHON=/usr/bin/python3
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci \
  && apk del .build-deps

FROM dependencies AS build
COPY . .
RUN npm run prisma:generate --workspace=@moneypilot/api
RUN npm run build --workspace=@moneypilot/api

# One-shot release step: `docker build --target migrate` and run it before starting new API
# containers. It contains the Prisma CLI, which the runtime image intentionally omits.
FROM build AS migrate
USER node
CMD ["npx", "prisma", "migrate", "deploy", "--schema", "apps/api/prisma/schema.prisma"]

FROM node:20.19-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PYTHON=/usr/bin/python3
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev --workspace=@moneypilot/api \
  && apk del .build-deps
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${API_PORT:-3001}/health" || exit 1
CMD ["node", "apps/api/dist/main.js"]
