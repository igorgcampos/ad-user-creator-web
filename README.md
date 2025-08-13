# AD User Creator - Sistema Completo

Sistema completo para criação de usuários no Active Directory com frontend React e backend Express.js + TypeScript.

## 🚀 Características

### Frontend
- **Interface Moderna**: React 18 com TypeScript e Tailwind CSS
- **Validação em Tempo Real**: Validação de formulários robusta
- **Sugestões de Username**: Geração automática de nomes de usuário
- **Design Responsivo**: Interface adaptável para mobile e desktop
- **Componentes Reutilizáveis**: Baseados em Radix UI

### Backend
- **API REST**: Express.js com TypeScript
- **Integração LDAP Real**: ldapjs para conexão direta ao Active Directory
- **Connection Pool**: Pool de conexões LDAP com até 10 conexões simultâneas
- **Circuit Breaker**: Proteção contra falhas em cascata com recuperação automática
- **Cache Layer**: Cache inteligente com TTL para melhor performance
- **LDAP Injection Prevention**: Sanitização de entrada para prevenir ataques LDAP
- **Validação Robusta**: Joi para validação de dados
- **Logging Estruturado**: Winston com rotação diária e logs seguros
- **Tratamento de Erros**: Tratamento personalizado de exceções com recovery automático
- **Segurança**: Helmet, CORS, Rate Limiting, Input Sanitization

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
- Express.js + TypeScript
- ldapjs (cliente LDAP)
- async-mutex (controle de concorrência)
- node-cache (caching layer)
- winston-daily-rotate-file (rotação de logs)
- Joi (validação)
- Winston (logging)
- Helmet (segurança)

### DevOps
- Docker + Docker Compose
- Nginx + Multi-stage builds
- Health checks + Monitoring

## 📋 Pré-requisitos

- Docker & Docker Compose
- Servidor LDAP/Active Directory configurado

## 🚀 Deploy na AWS EC2

### **Deploy Automatizado (Recomendado)**

1. **SSH na EC2:**

ssh -i sua-chave.pem ec2-user@44.222.181.172

2. **Clone e Execute:**

git clone <seu-repositório>
cd ad-user-creator-web
make deploy-ec2


### **Deploy Manual**

1. **Instale Docker na EC2:**

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER


2. **Instale Docker Compose:**

sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose


3. **Configure e Execute:**

cp env.example .env
# Edite .env com suas configurações de LDAP
make build
make up


### **⚠️ Configuração do Security Group**

Configure o Security Group da EC2 para permitir:

- Porta 22 (SSH)
- Porta 8082 (Frontend)
- Porta 80 (HTTP) - opcional

**Nota**: O backend roda internamente na rede Docker e não precisa de porta externa.


### **🌐 URLs da Aplicação**
- **Frontend**: http://44.222.181.172:8082
- **Backend**: Interno (acesso via frontend)
- **Health Check**: Interno (monitoramento automático)

## 🔧 Desenvolvimento Local

### **Usando Docker (Recomendado)**

1. **Clone o repositório:**

git clone <repository-url>
cd ad-user-creator-web


2. **Configure o ambiente:**

cp env.example .env
# Edite .env com suas configurações de LDAP


3. **Inicie os serviços:**

# Produção
make up

# Desenvolvimento
make up-dev


4. **Acesse a aplicação:**
- Frontend: http://localhost:8082
- Backend API: Interno (acessível via Docker network)
- Health Check: Monitoramento automático via Docker healthcheck

## 📡 Endpoints da API

### Usuários
- `POST /api/v1/users/create` - Criar usuário
- `GET /api/v1/users/exists/{login_name}` - Verificar existência
- `GET /api/v1/users/info/{login_name}` - Obter informações
- `POST /api/v1/users/validate-password` - Validar senha
- `GET /api/v1/users/suggest-username/{first_name}/{last_name}` - Sugerir nome
- `GET /api/v1/users/connection-test` - Testar conexão AD

### Sistema
- `GET /health` - Health check
- `GET /` - Informações da API

## 🔧 Configuração

Copie `env.example` para `.env` e configure:


# Aplicação
NODE_ENV=production
PORT=8000
LOG_LEVEL=info

# Segurança
SECRET_KEY=your-secret-key-change-in-production
BACKEND_CORS_ORIGINS=http://44.222.181.172:3000

# Active Directory
AD_SERVER=ldap://seu-servidor:389
AD_DOMAIN=seu-dominio.local
AD_BASE_DN=DC=seu-dominio,DC=local
AD_USERNAME=admin
AD_PASSWORD=sua-senha
AD_USE_SSL=false
AD_USERS_OU=OU=Users,DC=seu-dominio,DC=local
AD_TIMEOUT=10000

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Requisitos de senha
MIN_PASSWORD_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# Frontend (já configurado para EC2)
FRONTEND_PORT=8082
REACT_APP_API_URL=http://backend:8000


## 📁 Estrutura do Projeto


ad-user-creator-web/
├── backend/                 # API Express + TypeScript
│   ├── src/
│   │   ├── config/         # Configurações da aplicação
│   │   ├── middleware/     # Middleware Express
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Serviços (AD, LDAP)
│   │   ├── schemas/        # Validação Joi
│   │   ├── types/          # Tipos TypeScript
│   │   └── index.ts        # Arquivo principal
│   ├── dist/               # Código compilado
│   ├── Dockerfile          # Container do backend
│   ├── package.json        # Dependências Node.js
│   └── tsconfig.json       # Configuração TypeScript
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


## 🔍 Comandos Úteis


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


## 🧪 Testes

Execute os testes do backend:

make test


## 🔒 Segurança

- **Input Sanitization**: Prevenção de LDAP Injection com escape de caracteres especiais
- **Credential Security**: Logs sanitizados sem exposição de credenciais
- **Connection Pool Security**: Gerênciamento seguro de conexões com cleanup automático
- **Circuit Breaker**: Proteção contra ataques DoS e falhas em cascata
- **Validação de entrada**: Joi com schemas rigorosos
- **Middleware Helmet**: Headers de segurança completos
- **CORS configurado**: Apropriadamente para diferentes ambientes
- **Rate limiting**: Configurável por endpoint
- **Headers de segurança**: Via Nginx
- **Usuário não-root**: Nos containers Docker

## 📊 Monitoramento

- **Health checks automáticos**: Docker healthcheck integrado
- **Circuit Breaker Metrics**: Monitoramento de falhas e recuperação
- **Connection Pool Monitoring**: Métricas de uso do pool de conexões
- **Cache Performance**: Estatísticas de hit/miss do cache
- **Logs estruturados**: JSON format com rotação diária
- **Log Rotation**: Rotação automática por tamanho (20MB) e tempo (14 dias)
- **Métricas de performance**: Via Nginx
- **Error Recovery Tracking**: Logs de recuperação automática

## 🚨 Tratamento de Erros

A API retorna códigos de status apropriados:
- `200` - Sucesso
- `201` - Criado
- `400` - Dados inválidos
- `404` - Não encontrado
- `409` - Usuário já existe
- `503` - Erro de conexão AD

## 📖 Funcionalidades

### Criação de Usuários
- Validação completa de dados
- Verificação de existência antes da criação
- Geração automática de email
- Criação real no Active Directory via LDAP

### Validação de Senha
- Requisitos configuráveis
- Validação de força em tempo real
- Feedback detalhado dos requisitos

### Sugestões de Username
- Geração automática baseada em nome/sobrenome
- Verificação de disponibilidade
- Sugestões alternativas se necessário

### Conexão LDAP
- **Connection Pooling**: Pool de até 10 conexões simultâneas
- **Circuit Breaker**: Proteção contra falhas com recuperação automática
- **Cache Layer**: Cache inteligente para operações frequentes (5-10 min TTL)
- **LDAP Injection Prevention**: Sanitização completa de inputs
- **Teste de conectividade**: Health checks contínuos
- **Autenticação segura**: Credenciais protegidas
- **Timeout configurável**: Controle fino de timeouts
- **Reconexão automática**: Recovery inteligente de falhas

## 🔧 Troubleshooting

### **Problemas Comuns:**

1. **Erro de conexão LDAP:**
   - Verifique configurações AD_* no .env
   - Teste conectividade: `make health`
   - Verifique logs: `make logs`

2. **Erro de conexão frontend/backend:**
   - Verifique se as portas estão abertas no Security Group
   - Confirme se os serviços estão rodando: `make status`

3. **Build falha:**
   - Limpe o cache: `make clean`
   - Rebuild: `make build`

4. **Frontend não carrega:**
   - Verifique logs: `docker-compose logs frontend`
   - Teste direct: `curl http://localhost:3000`

### **Logs Úteis:**

# Ver todos os logs
make logs

# Logs específicos
docker-compose logs frontend
docker-compose logs backend

# Logs em tempo real
docker-compose logs -f
```

### **Configuração LDAP:**

# Teste de conexão LDAP (via container)
docker-compose exec backend curl http://localhost:8000/api/v1/users/connection-test

# Ou via frontend
curl http://localhost:8082 # Frontend deve estar conectado ao backend

# Verificar configuração
docker-compose exec backend printenv | grep AD_


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

## 🎯 Tecnologias Utilizadas

### Backend
- **Express.js** - Framework web
- **TypeScript** - Linguagem tipada
- **ldapjs** - Cliente LDAP
- **Joi** - Validação de dados
- **Winston** - Logging estruturado
- **Helmet** - Middleware de segurança
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting
- **async-mutex** - Controle de concorrência thread-safe
- **node-cache** - Caching para performance
- **winston-daily-rotate-file** - Rotação automática de logs

### Frontend
- **React** - Biblioteca UI
- **TypeScript** - Linguagem tipada
- **Tailwind CSS** - Framework CSS
- **Radix UI** - Componentes base
- **React Query** - Gerenciamento de estado
- **React Router** - Roteamento
- **Lucide React** - Ícones
