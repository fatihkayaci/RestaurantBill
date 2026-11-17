# 1. Build aşaması
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Derleme için Node bellek sınırı (MB). Production imajı GitHub'ın makinesinde derlenir (deploy.yml 4096 verir);
# küçük sunucuda elle derlenecekse varsayılan düşük tutulur.
ARG NODE_HEAP_MB=1024
RUN NODE_OPTIONS="--max-old-space-size=${NODE_HEAP_MB}" npm run build

# 2. Serve aşaması
FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
