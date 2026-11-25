# ==========================================
# Etapa 1: Compilación de Vite
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=https://cootranar-api-ecosystem.onrender.com/api
ARG VITE_GOOGLE_CLIENT_ID=186642839091-tqu5tuisap4q95d2hldn1a0u64cde6p8.apps.googleusercontent.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN pnpm run build

# ==========================================
# Etapa 2: Servidor Nginx de Producción
# ==========================================
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
