# Минимальный Dockerfile для самостоятельной сборки Lampa из исходников
# (yumata/lampa-source). Никаких кастомных правок исходников — голый upstream.
# Когда понадобится наша кастомизация — правки идут прямо в lampa-source/src/.

# ===== STAGE 1: build =====
FROM node:20-alpine AS build
WORKDIR /app

COPY lampa-source/ .

# legacy-peer-deps — у Lampa старые зависимости с конфликтами в npm v8+
RUN npm install --legacy-peer-deps

# gulp build — наш кастомный task (см. exports.build в gulpfile.js):
# rollup-сборка app.js → плагины → SCSS → языки → sync_web → pack_github.
# Один pack_github не работает: ему нужен dest/app.js от merge-шага.
RUN npx gulp build

# ===== STAGE 2: serve =====
FROM nginx:alpine

COPY --from=build /app/build/github/lampa/ /usr/share/nginx/html/

EXPOSE 80
