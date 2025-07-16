# Backend - AD User Creator

## Configuração do Ambiente

### 1. Arquivo .env

O backend precisa de um arquivo `.env` neste diretório (`backend/.env`) com as seguintes variáveis:

```bash
# Copie o arquivo de exemplo
cp env.example .env

# Edite com suas configurações
nano .env
```

### 2. Variáveis Obrigatórias

As seguintes variáveis são **obrigatórias** e devem ser configuradas:

- `AD_SERVER`: URL do servidor Active Directory (ex: `ldap://192.168.1.100:389`)
- `AD_DOMAIN`: Domínio do AD (ex: `empresa.local`)
- `AD_BASE_DN`: Base DN do domínio (ex: `DC=empresa,DC=local`)
- `AD_USERNAME`: Usuário de serviço com permissões para criar usuários
- `AD_PASSWORD`: Senha do usuário de serviço
- `AD_USERS_OU`: OU onde os usuários serão criados
- `SECRET_KEY`: Chave secreta para JWT/sessions

### 3. Exemplo de Configuração

```env
AD_SERVER=ldap://192.168.100.15:389
AD_DOMAIN=TELESPAZIO.local
AD_BASE_DN=DC=TELESPAZIO,DC=local
AD_USERNAME=svc_user_creator
AD_PASSWORD=sua_senha_aqui
AD_USERS_OU=OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local
SECRET_KEY=sua-chave-secreta-aqui
```

### 4. Testando a Configuração

```bash
# Inicie o container
docker-compose up -d backend

# Teste a conexão
curl http://localhost:8000/api/v1/users/connection-test

# Veja os logs
docker-compose logs backend
```

### 5. Permissões do AD

O usuário de serviço precisa das seguintes permissões:

- **Leitura**: Base DN e estrutura organizacional
- **Criação**: Usuários na OU especificada
- **Escrita**: Atributos de usuário (nome, email, senha, etc.)
- **Reset de senha**: Para definir senhas iniciais

### 6. Resolução de Problemas

Se o backend não iniciar, verifique:

1. Se o arquivo `.env` existe em `backend/.env`
2. Se todas as variáveis obrigatórias estão definidas
3. Se o servidor AD está acessível pela rede
4. Se o usuário de serviço tem as permissões corretas

```bash
# Verificar logs do backend
docker-compose logs backend --follow
``` 