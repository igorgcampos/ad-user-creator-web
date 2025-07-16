# =============================================================================
# Multi-stage Docker build para AD User Creator API (Node.js + Express)
# =============================================================================

# Stage 1: Build stage - Instala dependências e compila TypeScript
FROM node:20-alpine as builder

# Configurações de build
ENV NODE_ENV=production \
    NPM_CONFIG_CACHE=/tmp/.npm \
    NPM_CONFIG_LOGLEVEL=warn

# Instala dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Cria usuário não-root para segurança
RUN addgroup -g 1000 -S app && \
    adduser -u 1000 -S app -G app

# Cria e usa diretório de trabalho
WORKDIR /app

# Copia package files primeiro para cache eficiente
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production --silent

# Copia código fonte
COPY . .

# Compila TypeScript
RUN npm run build

# Remove dependências de desenvolvimento
RUN npm prune --production

# =============================================================================
# Stage 2: Runtime stage - Ambiente de produção mínimo
FROM node:20-alpine as runtime

# Configurações de runtime
ENV NODE_ENV=production \
    PATH="/app/node_modules/.bin:$PATH"

# Instala apenas dependências de runtime necessárias
RUN apk add --no-cache \
    curl \
    dumb-init

# Cria usuário não-root
RUN addgroup -g 1000 -S app && \
    adduser -u 1000 -S app -G app

# Cria diretórios necessários
RUN mkdir -p /app/logs /app/data && \
    chown -R app:app /app

# Muda para usuário não-root
USER app

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos compilados do stage de build
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package*.json ./

# Expõe porta da aplicação
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use dumb-init para handling de sinais
ENTRYPOINT ["dumb-init", "--"]

# Comando padrão
CMD ["node", "dist/index.js"] 