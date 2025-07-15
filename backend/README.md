# AD User Creator API

API REST para criação de usuários no Active Directory desenvolvida com FastAPI.

## 🚀 Funcionalidades

- ✅ Criação de usuários no Active Directory
- ✅ Validação robusta de dados
- ✅ Verificação de existência de usuários
- ✅ Validação de força de senha
- ✅ Sugestões de nome de usuário
- ✅ Logging estruturado
- ✅ Tratamento de erros personalizado
- ✅ Documentação automática (OpenAPI/Swagger)
- ✅ Health checks
- ✅ Middleware de segurança

## 📋 Requisitos

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic

## 🛠️ Instalação

### Usando Docker (Recomendado)

1. Clone o repositório
2. Execute o backend:
```bash
docker-compose up backend
```

### Instalação Local

1. Instale as dependências:
```bash
pip install -r requirements.txt
```

2. Execute a aplicação:
```bash
uvicorn app.main:app --reload
```

## 🔧 Configuração

Copie o arquivo `env.example` para `.env` e configure as variáveis:

```env
# Active Directory
AD_SERVER=ldap://seu-servidor:389
AD_DOMAIN=seu-dominio.local
AD_USERNAME=admin
AD_PASSWORD=senha
```

## 📡 Endpoints

### Usuários

- `POST /api/v1/users/create` - Criar usuário
- `GET /api/v1/users/exists/{login_name}` - Verificar existência
- `GET /api/v1/users/info/{login_name}` - Obter informações
- `POST /api/v1/users/validate-password` - Validar senha
- `GET /api/v1/users/suggest-username/{first_name}/{last_name}` - Sugerir nome
- `GET /api/v1/users/connection-test` - Testar conexão AD

### Sistema

- `GET /health` - Health check
- `GET /api/v1/docs` - Documentação Swagger

## 🔍 Exemplo de Uso

### Criar Usuário

```bash
curl -X POST "http://localhost:8000/api/v1/users/create" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "João",
    "lastName": "Silva",
    "loginName": "joao.silva",
    "password": "MinhaSenh@123"
  }'
```

### Verificar Existência

```bash
curl "http://localhost:8000/api/v1/users/exists/joao.silva"
```

## 🚨 Tratamento de Erros

A API retorna códigos de status HTTP apropriados:

- `200` - Sucesso
- `201` - Criado
- `400` - Dados inválidos
- `404` - Não encontrado
- `409` - Conflito (usuário já existe)
- `503` - Erro de conexão com AD

## 📊 Logging

Logs são salvos em:
- `logs/ad-user-creator.log` - Logs gerais
- `logs/ad-user-creator-errors.log` - Apenas erros

## 🔒 Segurança

- Validação de entrada com Pydantic
- Middleware de segurança
- CORS configurado
- Headers de segurança
- Rate limiting (via Nginx)

## 🧪 Testes

Execute os testes:

```bash
pytest
```

## 📄 Licença

MIT License 