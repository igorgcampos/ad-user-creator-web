#!/bin/bash

# Script para restaurar configuração funcionando e investigar
# Uso: ./restore-and-investigate.sh

echo "🔧 Restaurar e Investigar AD"
echo "============================"

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

echo
log_info "===== PASSO 1: RESTAURAR CONFIGURAÇÃO QUE FUNCIONAVA ====="

# Verificar backups disponíveis
if [ -f "backend/.env.backup" ]; then
    log_info "Restaurando backup original..."
    cp backend/.env.backup backend/.env
    log_success "Backup restaurado"
else
    log_warning "Backup não encontrado, criando configuração básica..."
    
    # Criar configuração básica que sabemos que funcionava
    cat > backend/.env << EOF
# Ambiente
NODE_ENV=production
PORT=8000

# Segurança
SECRET_KEY=your-secret-key-here-change-in-production
BACKEND_CORS_ORIGINS=http://44.222.181.172:3000,https://44.222.181.172:3000,http://44.222.181.172,https://44.222.181.172

# Active Directory
AD_SERVER=ldap://192.168.100.15:389
AD_DOMAIN=TELESPAZIO.local
AD_BASE_DN=DC=TELESPAZIO,DC=local
AD_USERNAME=svc_user_creator
AD_PASSWORD=tpz!@#123
AD_USE_SSL=false
AD_USERS_OU=OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local
AD_TIMEOUT=10000

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Password Requirements
MIN_PASSWORD_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
EOF
    
    log_success "Configuração básica criada"
fi

# Reiniciar backend
log_info "Reiniciando backend..."
docker-compose restart backend
sleep 10

echo
log_info "===== PASSO 2: VERIFICAR CONNECTION-TEST ====="

connection_result=$(curl -s -w "%{http_code}" http://localhost:8000/api/v1/users/connection-test)

if [ "$connection_result" = "200" ]; then
    log_success "✅ Connection-test funcionando!"
    
    # Obter resposta completa
    connection_response=$(curl -s http://localhost:8000/api/v1/users/connection-test)
    echo "Resposta: $connection_response"
    
else
    log_error "❌ Connection-test ainda falhando (HTTP $connection_result)"
    
    # Verificar logs do backend
    echo
    log_info "Verificando logs do backend..."
    docker-compose logs backend --tail=20
    
    exit 1
fi

echo
log_info "===== PASSO 3: INVESTIGAR DIFERENÇA ENTRE CONNECTION-TEST E CREATE-USER ====="

log_info "Vamos comparar o que acontece em cada operação..."

# Testar createUser para ver exatamente onde falha
echo
log_info "Iniciando logs do backend em tempo real..."
docker-compose logs -f backend &
LOGS_PID=$!

sleep 2

echo
log_info "Testando criação de usuário (observe os logs acima)..."

create_response=$(timeout 30 curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/users/create \
    -H "Content-Type: application/json" \
    -d '{
        "firstName": "Debug",
        "lastName": "Test",
        "loginName": "debug.test",
        "password": "DebugTest@123!"
    }')

create_code=$(echo "$create_response" | tail -n1)
create_body=$(echo "$create_response" | sed '$d')

# Parar logs
kill $LOGS_PID 2>/dev/null

echo
if [ "$create_code" = "201" ] || [ "$create_code" = "200" ]; then
    log_success "🎉 CRIAÇÃO FUNCIONOU!"
    echo "Resposta: $create_body"
    
    echo
    log_success "PROBLEMA RESOLVIDO! A configuração básica funcionou."
    log_info "A configuração correta estava no backup original."
    
elif [ "$create_code" = "409" ]; then
    log_success "🎉 CRIAÇÃO FUNCIONOU! (Usuário já existe)"
    echo "Resposta: $create_body"
    
    echo
    log_success "PROBLEMA RESOLVIDO! A configuração básica funcionou."
    
else
    log_error "❌ Criação falhou (HTTP $create_code)"
    echo "Resposta: $create_body"
    
    echo
    log_info "===== PASSO 4: ANÁLISE DETALHADA DOS LOGS ====="
    echo "Vamos analisar exatamente onde a criação falha vs connection-test..."
    
    # Mostrar logs recentes do backend
    docker-compose logs backend --tail=30
fi

echo
log_info "===== CONFIGURAÇÃO ATUAL ====="
echo "Arquivo backend/.env:"
cat backend/.env | grep -E "^AD_"

echo
log_info "===== ANÁLISE ====="

if [ "$connection_result" = "200" ] && ([ "$create_code" = "201" ] || [ "$create_code" = "200" ] || [ "$create_code" = "409" ]); then
    echo
    log_success "✅ TUDO FUNCIONANDO!"
    echo "1. Connection-test: OK"
    echo "2. Criação de usuário: OK"
    echo "3. Configuração correta salva em backend/.env"
    
elif [ "$connection_result" = "200" ] && [ "$create_code" != "201" ] && [ "$create_code" != "200" ] && [ "$create_code" != "409" ]; then
    echo
    log_warning "⚠️ PROBLEMA PARCIAL IDENTIFICADO:"
    echo "1. Connection-test: ✅ Funciona"
    echo "2. Criação de usuário: ❌ Falha"
    echo "3. Isso indica problema específico de PERMISSÕES PARA ESCRITA"
    echo
    echo "Possíveis causas:"
    echo "- Usuário svc_user_creator pode AUTENTICAR mas não pode CRIAR usuários"
    echo "- Permissões insuficientes na OU de destino"
    echo "- Falta de membership em grupos como Domain Admins ou Account Operators"
    echo
    echo "RECOMENDAÇÃO:"
    echo "Verificar no servidor AD as permissões do usuário svc_user_creator"
    echo "Execute no servidor AD:"
    echo "Get-ADUser -Identity 'svc_user_creator' | Select-Object MemberOf"
    echo "Get-ADUser -Identity 'svc_user_creator' | Format-List"
    
else
    echo
    log_error "❌ PROBLEMA PERSISTE"
    echo "Connection-test e criação falharam"
    echo "Verificar configuração básica do AD"
fi

echo
log_info "===== PRÓXIMOS PASSOS ====="

if [ "$connection_result" = "200" ]; then
    echo "1. ✅ Connection-test funciona - configuração básica OK"
    
    if [ "$create_code" = "201" ] || [ "$create_code" = "200" ] || [ "$create_code" = "409" ]; then
        echo "2. ✅ Criação funciona - PROBLEMA RESOLVIDO!"
        echo "3. 🎉 Sistema pronto para uso!"
    else
        echo "2. ❌ Criação falha - problema de PERMISSÕES"
        echo "3. 🔧 Verificar permissões do usuário no servidor AD"
        echo "4. 🔧 Verificar se usuário pertence a grupos administrativos"
        echo "5. 🔧 Considerar usar usuário com mais permissões"
    fi
else
    echo "1. ❌ Connection-test falha - problema básico de configuração"
    echo "2. 🔧 Verificar credenciais, servidor AD, conectividade"
    echo "3. 🔧 Executar diagnóstico profundo: ./deep-ad-diagnosis.sh"
fi 