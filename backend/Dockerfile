# =============================================================================
# Multi-stage Docker build para AD User Creator API (Node.js + Express)
# =============================================================================

# Stage 1: Build stage - Instala dependências e compila TypeScript
FROM node:20-alpine as builder

# Configurações de build - NODE_ENV=development para instalar devDependencies
ENV NODE_ENV=development \
    NPM_CONFIG_CACHE=/tmp/.npm \
    NPM_CONFIG_LOGLEVEL=warn

# Instala dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Cria usuário não-root para segurança (usando GID/UID diferentes)
RUN addgroup -g 1001 -S app && \
    adduser -u 1001 -S app -G app

# Cria e usa diretório de trabalho
WORKDIR /app

# Copia package files primeiro para cache eficiente
COPY package*.json ./

# Instala TODAS as dependências (incluindo devDependencies) para compilar TypeScript
RUN npm install --silent

# Copia código fonte
COPY . .

# Compila TypeScript
RUN npm run build

# Remove dependências de desenvolvimento após compilação
RUN npm prune --omit=dev

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

# Cria usuário não-root de forma mais robusta
RUN if ! getent group app >/dev/null 2>&1; then \
        addgroup -g 1001 -S app; \
    fi && \
    if ! getent passwd app >/dev/null 2>&1; then \
        adduser -u 1001 -S app -G app; \
    fi

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