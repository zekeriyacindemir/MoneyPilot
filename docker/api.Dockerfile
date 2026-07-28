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
CMD ["node", "apps/api/dist/main.js"]
