# AD User Creator - Makefile

.PHONY: help build up down logs clean test lint format

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
	@echo ""

# Build das imagens
build:
	docker-compose build

# Inicia em produção
up:
	docker-compose up -d

# Inicia em desenvolvimento
up-dev:
	docker-compose -f docker-compose.dev.yml up -d

# Para os serviços
down:
	docker-compose down

# Para os serviços de desenvolvimento
down-dev:
	docker-compose -f docker-compose.dev.yml down

# Exibe logs
logs:
	docker-compose logs -f

# Logs de desenvolvimento
logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f

# Limpa containers e volumes
clean:
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

# Executa testes no backend
test:
	docker-compose exec backend pytest

# Linting do backend
lint:
	docker-compose exec backend flake8 app/
	docker-compose exec backend black --check app/

# Formatar código do backend
format:
	docker-compose exec backend black app/
	docker-compose exec backend isort app/

# Inicia apenas o backend
backend:
	docker-compose up -d backend

# Inicia apenas o frontend
frontend:
	docker-compose up -d frontend

# Backup do banco de dados simulado
backup:
	docker cp $$(docker-compose ps -q backend):/app/data ./backup-$$(date +%Y%m%d-%H%M%S)

# Instala dependências localmente
install:
	cd backend && pip install -r requirements.txt
	npm install

# Executa backend localmente
run-backend:
	cd backend && uvicorn app.main:app --reload

# Executa frontend localmente
run-frontend:
	npm run dev

# Health check
health:
	curl -f http://localhost:8000/health || echo "Backend não está rodando"
	curl -f http://localhost:3000/health || echo "Frontend não está rodando"

# Monitora logs em tempo real
monitor:
	watch -n 1 'docker-compose ps && echo "=== BACKEND LOGS ===" && docker-compose logs --tail=10 backend' 