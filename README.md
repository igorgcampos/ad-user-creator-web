# AD User Creator - Sistema Completo

Sistema completo para criação de usuários no Active Directory com frontend React e backend FastAPI.

## 🚀 Características

### Frontend
- **Interface Moderna**: React 18 com TypeScript e Tailwind CSS
- **Validação em Tempo Real**: Validação de formulários robusta
- **Sugestões de Username**: Geração automática de nomes de usuário
- **Design Responsivo**: Interface adaptável para mobile e desktop
- **Componentes Reutilizáveis**: Baseados em Radix UI

### Backend
- **API REST**: FastAPI com documentação automática
- **Validação Robusta**: Schemas Pydantic para validação de dados
- **Simulação de AD**: Serviço simulado para demonstração
- **Logging Estruturado**: Sistema de logs completo
- **Tratamento de Erros**: Tratamento personalizado de exceções
- **Segurança**: Middleware de segurança e CORS configurado

### Infraestrutura
- **Docker**: Containerização completa com multi-stage builds
- **Docker Compose**: Orquestração de serviços para dev e produção
- **Nginx**: Reverse proxy com cache e compressão
- **Health Checks**: Monitoramento de saúde dos serviços

## 🛠️ Stack Tecnológica

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI
- React Query + React Router
- Lucide React (ícones)

### Backend
- FastAPI + Python 3.11
- Pydantic + Uvicorn
- Logging estruturado

### DevOps
- Docker + Docker Compose
- Nginx + Multi-stage builds
- Health checks + Monitoring

## 📋 Pré-requisitos

- Docker & Docker Compose
- Node.js 18+ (para desenvolvimento local)
- Python 3.11+ (para desenvolvimento local)

## 🚀 Início Rápido

### Usando Docker (Recomendado)

1. **Clone o repositório:**

git clone <repository-url>
cd ad-user-creator-web


2. **Inicie os serviços:**

# Produção
make up

# Desenvolvimento
make up-dev


3. **Acesse a aplicação:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Documentação: http://localhost:8000/api/v1/docs

### Desenvolvimento Local

1. **Backend:**

cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload


2. **Frontend:**

npm install
npm run dev


## 📡 Endpoints da API

### Usuários
- `POST /api/v1/users/create` - Criar usuário
- `GET /api/v1/users/exists/{login_name}` - Verificar existência
- `GET /api/v1/users/info/{login_name}` - Obter informações
- `POST /api/v1/users/validate-password` - Validar senha
- `GET /api/v1/users/suggest-username/{first_name}/{last_name}` - Sugerir nome

### Sistema
- `GET /health` - Health check
- `GET /api/v1/docs` - Documentação Swagger

## 🔧 Configuração

Copie `env.example` para `.env` e configure:


# Backend
ENVIRONMENT=development
SECRET_KEY=your-secret-key
AD_SERVER=ldap://localhost:389
AD_DOMAIN=example.local

# Frontend
REACT_APP_API_URL=http://localhost:8000


## 📁 Estrutura do Projeto

```
ad-user-creator-web/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints da API
│   │   ├── core/           # Configurações e exceções
│   │   ├── schemas/        # Schemas Pydantic
│   │   └── services/       # Serviços de negócio
│   ├── tests/              # Testes
│   ├── Dockerfile          # Container do backend
│   └── requirements.txt    # Dependências Python
├── src/                    # Frontend React
│   ├── components/         # Componentes React
│   ├── pages/             # Páginas
│   └── hooks/             # Hooks customizados
├── docker-compose.yml      # Orquestração produção
├── docker-compose.dev.yml  # Orquestração desenvolvimento
├── Dockerfile.frontend     # Container do frontend
├── nginx.conf             # Configuração Nginx
└── Makefile               # Comandos úteis
```

## 🔍 Comandos Úteis

```bash
# Iniciar serviços
make up                    # Produção
make up-dev               # Desenvolvimento

# Logs
make logs                 # Ver logs
make monitor             # Monitorar em tempo real

# Testes
make test                # Executar testes
make health              # Verificar saúde

# Limpeza
make clean               # Limpar containers
make down                # Parar serviços
```

## 🧪 Testes

Execute os testes do backend:
```bash
make test
```

Ou localmente:
```bash
cd backend && pytest
```

## 🔒 Segurança

- Validação de entrada com Pydantic
- Middleware de segurança HTTP
- CORS configurado apropriadamente
- Headers de segurança via Nginx
- Usuário não-root nos containers

## 📊 Monitoramento

- Health checks automáticos
- Logs estruturados em arquivos
- Métricas de performance via Nginx
- Rotação de logs configurada

## 🚨 Tratamento de Erros

A API retorna códigos de status apropriados:
- `200` - Sucesso
- `201` - Criado
- `400` - Dados inválidos
- `409` - Usuário já existe
- `503` - Erro de conexão AD

## 📖 Documentação

- **API**: http://localhost:8000/api/v1/docs
- **Backend**: `backend/README.md`
- **Makefile**: `make help`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato.
