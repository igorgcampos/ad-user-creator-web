# =============================================================================
# Multi-stage Docker build para AD User Creator API
# =============================================================================

# Stage 1: Build stage - Instala dependências e prepara ambiente
FROM python:3.11-slim as builder

# Configurações de build
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instala dependências do sistema necessárias para build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root para segurança
RUN useradd --create-home --shell /bin/bash app

# Cria e usa diretório de trabalho
WORKDIR /app

# Copia requirements primeiro para cache eficiente
COPY requirements.txt .

# Cria virtual environment e instala dependências
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install -r requirements.txt

# =============================================================================
# Stage 2: Runtime stage - Ambiente de produção mínimo
FROM python:3.11-slim as runtime

# Configurações de runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    ENVIRONMENT="production"

# Instala apenas dependências de runtime necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Cria usuário não-root
RUN useradd --create-home --shell /bin/bash --uid 1000 app

# Copia virtual environment do stage de build
COPY --from=builder /opt/venv /opt/venv

# Cria diretórios necessários
RUN mkdir -p /app/logs /app/data && chown -R app:app /app

# Muda para usuário não-root
USER app

# Define diretório de trabalho
WORKDIR /app

# Copia código da aplicação
COPY --chown=app:app . .

# Expõe porta da aplicação
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando padrão
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"] 