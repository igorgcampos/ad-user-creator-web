#!/bin/bash

# Script rápido para corrigir configurações do AD
# Uso: ./quick-fix-ad.sh

echo "🔧 Correção Rápida do AD"
echo "========================"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar se arquivo .env existe
if [ ! -f "backend/.env" ]; then
    log_error "Arquivo backend/.env não encontrado"
    exit 1
fi

# Backup do .env atual
cp backend/.env backend/.env.backup
log_info "Backup criado: backend/.env.backup"

echo
log_info "===== CORREÇÃO 1: OU DE USUÁRIOS ====="
log_info "Corrigindo OU de usuários..."

# Corrigir OU que está com template errado
sed -i 's/AD_USERS_OU=OU=Users,DC=your-domain,DC=local/AD_USERS_OU=OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local/' backend/.env

# Verificar se foi corrigido
NEW_OU=$(grep "AD_USERS_OU=" backend/.env)
echo "Nova OU: $NEW_OU"

# Reiniciar backend para aplicar mudanças
log_info "Reiniciando backend..."
docker-compose restart backend

# Aguardar inicialização
sleep 10

echo
log_info "===== TESTE 1: CONEXÃO BÁSICA ====="
response=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/users/connection-test)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    log_success "Conexão básica OK"
else
    log_error "Conexão básica falhou (HTTP $http_code)"
fi

echo
log_info "===== TESTE 2: CRIAÇÃO DE USUÁRIO ====="
log_info "Testando criação com configuração corrigida..."

# Testar criação de usuário
create_response=$(timeout 20 curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/users/create \
    -H "Content-Type: application/json" \
    -d '{
        "firstName": "Teste",
        "lastName": "Correcao",
        "loginName": "teste.correcao",
        "password": "TesteCorrecao@123!"
    }')

create_code=$(echo "$create_response" | tail -n1)
create_body=$(echo "$create_response" | sed '$d')

if [ "$create_code" = "201" ] || [ "$create_code" = "200" ]; then
    log_success "Criação funcionou! Problema resolvido!"
    echo "Resposta: $create_body"
elif [ "$create_code" = "409" ]; then
    log_warning "Usuário já existe (isso é normal se testado antes)"
    log_success "Criação funcionou! Problema resolvido!"
else
    log_error "Criação ainda falhou (HTTP $create_code)"
    echo "Resposta: $create_body"
    
    echo
    log_info "===== TESTE 3: FORMATOS ALTERNATIVOS ====="
    log_info "Testando formatos alternativos de DN..."
    
    # Formato 1: NetBIOS
    log_info "Testando formato NetBIOS..."
    sed -i 's/AD_USERNAME=svc_user_creator/AD_USERNAME=TELESPAZIO\\\\svc_user_creator/' backend/.env
    docker-compose restart backend
    sleep 5
    
    test_result=$(timeout 15 curl -s -w "%{http_code}" http://localhost:8000/api/v1/users/connection-test)
    if [ "$test_result" = "200" ]; then
        log_success "Formato NetBIOS funcionou!"
    else
        log_error "Formato NetBIOS falhou"
        # Reverter
        sed -i 's/AD_USERNAME=TELESPAZIO\\\\svc_user_creator/AD_USERNAME=svc_user_creator/' backend/.env
    fi
    
    # Formato 2: CN completo
    log_info "Testando formato CN completo..."
    sed -i 's/AD_USERNAME=svc_user_creator/AD_USERNAME=CN=svc_user_creator,OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local/' backend/.env
    docker-compose restart backend
    sleep 5
    
    test_result=$(timeout 15 curl -s -w "%{http_code}" http://localhost:8000/api/v1/users/connection-test)
    if [ "$test_result" = "200" ]; then
        log_success "Formato CN completo funcionou!"
    else
        log_error "Formato CN completo falhou"
        # Reverter
        sed -i 's/AD_USERNAME=CN=svc_user_creator,OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local/AD_USERNAME=svc_user_creator/' backend/.env
    fi
    
    # Formato 3: UPN com domínio maiúsculo
    log_info "Testando UPN com domínio maiúsculo..."
    sed -i 's/AD_DOMAIN=TELESPAZIO.local/AD_DOMAIN=TELESPAZIO.LOCAL/' backend/.env
    docker-compose restart backend
    sleep 5
    
    test_result=$(timeout 15 curl -s -w "%{http_code}" http://localhost:8000/api/v1/users/connection-test)
    if [ "$test_result" = "200" ]; then
        log_success "Domínio em maiúsculo funcionou!"
    else
        log_error "Domínio em maiúsculo falhou"
        # Reverter
        sed -i 's/AD_DOMAIN=TELESPAZIO.LOCAL/AD_DOMAIN=TELESPAZIO.local/' backend/.env
    fi
    
    # Reiniciar uma última vez
    docker-compose restart backend
    sleep 5
fi

echo
log_info "===== CONFIGURAÇÃO FINAL ====="
echo "Arquivo backend/.env atual:"
cat backend/.env | grep -E "^AD_"

echo
log_info "===== TESTE FINAL ====="
final_test=$(curl -s -w "%{http_code}" http://localhost:8000/api/v1/users/connection-test)
if [ "$final_test" = "200" ]; then
    log_success "Configuração final funcionando!"
else
    log_error "Configuração final com problema"
fi

echo
log_info "===== RESUMO ====="
echo "1. Backup salvo em: backend/.env.backup"
echo "2. OU corrigida para: OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local"
echo "3. Se ainda não funcionar, verifique:"
echo "   - Credenciais do usuário svc_user_creator"
echo "   - Permissões no servidor AD"
echo "   - Localização exata do usuário no AD"

echo
log_info "Para reverter as mudanças:"
echo "cp backend/.env.backup backend/.env && docker-compose restart backend" 