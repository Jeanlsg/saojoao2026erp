# ===== Build stage =====
FROM node:20-alpine AS builder

WORKDIR /app

# Build args para variáveis VITE.
# EasyPanel nem sempre injeta variáveis no estágio de build, então deixamos
# os valores públicos do Supabase como fallback seguro para o Vite compilar.
ARG VITE_SUPABASE_URL=https://fjprpiucjrqoauowekuk.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcHJwaXVjanJxb2F1b3dla3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTA2MjksImV4cCI6MjA5Mjg2NjYyOX0.rxB5M3xLFuYAKw-haXkrcDymDj3boq-N69In5a5OBK0
ARG VITE_SUPABASE_PROJECT_ID=fjprpiucjrqoauowekuk

# Expõe como ENV durante o build para o Vite ler em import.meta.env
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Instala dependências (usa lockfile se existir)
COPY package*.json ./
RUN npm ci || npm install

# Copia o restante do código e faz o build
COPY . .
RUN npm run build

# ===== Runtime stage =====
FROM nginx:alpine AS runtime

# Configuração do nginx com fallback SPA e suporte a $PORT do EasyPanel
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copia o build do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

ENV PORT=80
EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
