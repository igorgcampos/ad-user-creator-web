# AD User Creator - Makefile

.PHONY: help build up down logs clean test lint format deploy-ec2

# Default target
help:
	@echo "AD User Creator - Comandos disponíveis:"
	@echo ""
	@echo "  build      - Constrói as imagens Docker"
	@echo "  up         - Inicia os serviços em produção"
	@echo "  up-dev     - Inicia os serviços em desenvolvimento"
	@echo "  down       - Para os serviços"
	@echo "  logs       - Exibe os logs"
	@echo "  clean      - Remove containers e volumes"
	@echo "  test       - Executa os testes"
	@echo "  lint       - Executa linting no código"
	@echo "  format     - Formata o código"
	@echo "  backend    - Inicia apenas o backend"
	@echo "  frontend   - Inicia apenas o frontend"
	@echo "  deploy-ec2 - Deploy automatizado para EC2"
	@echo "  setup-ec2  - Configura ambiente EC2"
	@echo "  health     - Verifica saúde dos serviços"
	@echo "  status     - Status dos serviços"
	@echo "  restart    - Reinicia os serviços"
	@echo "  monitor    - Monitora logs em tempo real"
	@echo ""

# Build das imagens
build:
	@echo "🔨 Construindo imagens Docker..."
	docker-compose build

# Inicia em produção
up:
	@echo "🚀 Iniciando serviços em produção..."
	docker-compose up -d

# Inicia em desenvolvimento
up-dev:
	@echo "🚀 Iniciando serviços em desenvolvimento..."
	docker-compose -f docker-compose.dev.yml up -d

# Para os serviços
down:
	@echo "🛑 Parando serviços..."
	docker-compose down

# Para os serviços de desenvolvimento
down-dev:
	@echo "🛑 Parando serviços de desenvolvimento..."
	docker-compose -f docker-compose.dev.yml down

# Exibe logs
logs:
	docker-compose logs -f

# Logs de desenvolvimento
logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f

# Limpa containers e volumes
clean:
	@echo "🧹 Limpando containers e volumes..."
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

# Executa testes no backend
test:
	@echo "🧪 Executando testes..."
	docker-compose exec backend npm test

# Linting do backend
lint:
	@echo "🔍 Executando linting..."
	docker-compose exec backend npm run lint

# Formatar código do backend
format:
	@echo "💄 Formatando código..."
	docker-compose exec backend npm run lint:fix

# Inicia apenas o backend
backend:
	@echo "🔧 Iniciando apenas o backend..."
	docker-compose up -d backend

# Inicia apenas o frontend
frontend:
	@echo "🖥️ Iniciando apenas o frontend..."
	docker-compose up -d frontend

# Deploy automatizado para EC2
deploy-ec2:
	@echo "🚀 Iniciando deploy para EC2..."
	@chmod +x deploy-ec2.sh
	@./deploy-ec2.sh

# Configurar ambiente EC2
setup-ec2:
	@echo "🔧 Configurando ambiente EC2..."
	@if [ ! -f .env ]; then cp env.example .env; echo "✅ Arquivo .env criado"; fi
	@echo "📋 Verificando dependências..."
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker não instalado"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose não instalado"; exit 1; }
	@echo "✅ Ambiente configurado com sucesso!"

# Backup do banco de dados simulado
backup:
	@echo "💾 Criando backup..."
	docker cp $$(docker-compose ps -q backend):/app/data ./backup-$$(date +%Y%m%d-%H%M%S)

# Health check
health:
	@echo "🏥 Verificando saúde dos serviços..."
	@curl -f http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend com problema"
	@curl -f http://localhost:3000 && echo "✅ Frontend OK" || echo "❌ Frontend com problema"

# Monitora logs em tempo real
monitor:
	watch -n 1 'docker-compose ps && echo "=== BACKEND LOGS ===" && docker-compose logs --tail=10 backend'

# Restart dos serviços
restart:
	@echo "🔄 Reiniciando serviços..."
	docker-compose restart

# Status dos serviços
status:
	@echo "📊 Status dos serviços:"
	@docker-compose ps

# Compilar TypeScript do backend
compile:
	@echo "🔨 Compilando TypeScript..."
	docker-compose exec backend npm run build

# Instalar dependências do backend
install-deps:
	@echo "📦 Instalando dependências..."
	docker-compose exec backend npm install

# Executar shell no backend
shell-backend:
	@echo "🐚 Acessando shell do backend..."
	docker-compose exec backend /bin/sh

# Executar shell no frontend
shell-frontend:
	@echo "🐚 Acessando shell do frontend..."
	docker-compose exec frontend /bin/sh

# Teste de conexão LDAP
test-ldap:
	@echo "🔗 Testando conexão LDAP..."
	curl -f http://localhost:8000/api/v1/users/connection-test

# Validar configuração
validate-config:
	@echo "✅ Validando configuração..."
	@if [ ! -f .env ]; then echo "❌ Arquivo .env não encontrado"; exit 1; fi
	@grep -q "AD_SERVER=" .env || { echo "❌ AD_SERVER não configurado"; exit 1; }
	@grep -q "AD_DOMAIN=" .env || { echo "❌ AD_DOMAIN não configurado"; exit 1; }
	@grep -q "AD_USERNAME=" .env || { echo "❌ AD_USERNAME não configurado"; exit 1; }
	@echo "✅ Configuração válida!"

# Atualizar dependências
update-deps:
	@echo "⬆️ Atualizando dependências..."
	docker-compose exec backend npm update
	docker-compose exec frontend npm update

# Rebuild completo
rebuild:
	@echo "🔄 Rebuild completo..."
	make clean
	make build
	make up 