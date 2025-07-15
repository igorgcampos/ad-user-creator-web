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

## 🚀 Deploy na AWS EC2

### **Deploy Automatizado (Recomendado)**

1. **SSH na EC2:**
```bash
ssh -i sua-chave.pem ec2-user@44.222.181.172
```

2. **Clone e Execute:**
```bash
git clone <seu-repositório>
cd ad-user-creator-web
make deploy-ec2
```

### **Deploy Manual**

1. **Instale Docker na EC2:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

2. **Instale Docker Compose:**
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Configure e Execute:**
```bash
cp env.example .env
make build
make up
```

### **⚠️ Configuração do Security Group**

Configure o Security Group da EC2 para permitir:
```
- Porta 22 (SSH)
- Porta 3000 (Frontend)
- Porta 8000 (Backend)
- Porta 80 (HTTP) - opcional
```

### **🌐 URLs da Aplicação**
- **Frontend**: http://44.222.181.172:3000
- **Backend**: http://44.222.181.172:8000
- **API Docs**: http://44.222.181.172:8000/api/v1/docs

## 🔧 Desenvolvimento Local

### **Usando Docker (Recomendado)**

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd ad-user-creator-web
```

2. **Inicie os serviços:**
```bash
# Produção
make up

# Desenvolvimento
make up-dev
```

3. **Acesse a aplicação:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Documentação: http://localhost:8000/api/v1/docs

### **Desenvolvimento Local (Sem Docker)**

1. **Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

2. **Frontend:**
```bash
npm install
npm run dev
```

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

```env
# Backend
ENVIRONMENT=production
SECRET_KEY=your-secret-key
AD_SERVER=ldap://localhost:389
AD_DOMAIN=example.local

# Frontend (já configurado para EC2)
REACT_APP_API_URL=http://44.222.181.172:8000
```

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
├── deploy-ec2.sh          # Script de deploy EC2
└── Makefile               # Comandos úteis
```

## 🔍 Comandos Úteis

```bash
# Deploy
make deploy-ec2           # Deploy automatizado na EC2
make setup-ec2            # Configurar ambiente EC2

# Iniciar serviços
make up                   # Produção
make up-dev              # Desenvolvimento

# Logs e Monitoramento
make logs                # Ver logs
make health              # Verificar saúde
make status              # Status dos serviços
make monitor             # Monitorar em tempo real

# Testes
make test                # Executar testes

# Limpeza
make clean               # Limpar containers
make down                # Parar serviços
make restart             # Reiniciar serviços
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

- **API**: http://44.222.181.172:8000/api/v1/docs
- **Backend**: `backend/README.md`
- **Makefile**: `make help`

## 🔧 Troubleshooting

### **Problemas Comuns:**

1. **Erro de conexão:**
   - Verifique se as portas estão abertas no Security Group
   - Confirme se os serviços estão rodando: `make status`

2. **Build falha:**
   - Limpe o cache: `make clean`
   - Rebuild: `make build`

3. **Frontend não carrega:**
   - Verifique logs: `docker-compose logs frontend`
   - Teste direct: `curl http://localhost:3000`

### **Logs Úteis:**
```bash
# Ver todos os logs
make logs

# Logs específicos
docker-compose logs frontend
docker-compose logs backend

# Logs em tempo real
docker-compose logs -f
```

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
