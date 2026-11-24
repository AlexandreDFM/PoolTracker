FROM node:24-alpine AS build

WORKDIR /app

COPY client/package.json client/package-lock.json ./

RUN npm ci

COPY client/ ./

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
