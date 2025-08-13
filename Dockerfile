# =============================================================================
# Multi-stage Docker build para Frontend React
# =============================================================================

# Stage 1: Build stage - Compila a aplicação React
FROM node:18-alpine as builder

# Configurações de build
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# Instala dependências do sistema
RUN apk add --no-cache curl

# Cria usuário não-root
RUN addgroup -g 1001 -S app
RUN adduser -S app -u 1001 -G app

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de configuração
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY index.html ./
COPY components.json ./

# Instala TODAS as dependências (incluindo dev para build)
RUN npm ci --include=dev --silent

# Copia código fonte
COPY src/ ./src/
COPY public/ ./public/

# Build da aplicação
RUN npm run build

# =============================================================================
# Stage 2: Development stage - Para desenvolvimento local
FROM node:18-alpine as development

# Instala dependências do sistema
RUN apk add --no-cache curl

# Cria usuário não-root
RUN addgroup -g 1001 -S app
RUN adduser -S app -u 1001 -G app

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de configuração
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY index.html ./
COPY components.json ./

# Instala todas as dependências (incluindo dev)
RUN npm ci --silent

# Copia código fonte
COPY src/ ./src/
COPY public/ ./public/

# Muda para usuário não-root
USER app

# Expõe porta de desenvolvimento
EXPOSE 3000

# Comando para desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# =============================================================================
# Stage 3: Production stage - Nginx serve estáticos e faz proxy
FROM nginx:alpine as production

# Instala curl para health check
RUN apk add --no-cache curl

# Remove configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia arquivos buildados para diretório do nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]