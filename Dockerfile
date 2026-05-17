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

# Генерируем favicon.ico (16/32/64) и apple-touch-icon.png (180×180)
# из стандартного Lampa-лого. Тёмный фон #1d1f20 — как у самой страницы.
RUN apk add --no-cache imagemagick librsvg \
 && convert -background "#1d1f20" -density 400 \
      -resize 180x180 -gravity center -extent 180x180 \
      build/github/lampa/img/logo-icon.svg \
      build/github/lampa/apple-touch-icon.png \
 && convert -background "#1d1f20" -density 400 \
      -resize 64x64 -gravity center -extent 64x64 \
      build/github/lampa/img/logo-icon.svg \
      /tmp/favicon-base.png \
 && convert /tmp/favicon-base.png -define icon:auto-resize=16,32,48,64 \
      build/github/lampa/favicon.ico

# ===== STAGE 2: serve =====
FROM nginx:alpine

COPY --from=build /app/build/github/lampa/ /usr/share/nginx/html/

# nginx-конфиг: автоподстановка адреса сервера в msx/start.json
# (см. lampa.conf) — MSX работает без ручной правки файлов.
COPY lampa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
