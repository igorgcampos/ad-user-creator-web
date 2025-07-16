#!/bin/bash

# Script para corrigir deadlock do serviço AD
# Uso: ./fix-deadlock.sh

echo "🚨 Fix Deadlock - AD User Creator"
echo "=================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se o backend está rodando
log_info "Verificando status do backend..."
if ! curl -s http://localhost:8000/health > /dev/null; then
    log_error "Backend não está respondendo"
    log_info "Tentando reiniciar containers..."
    docker-compose down
    docker-compose up -d
    sleep 10
    
    if ! curl -s http://localhost:8000/health > /dev/null; then
        log_error "Backend ainda não está respondendo após reinicialização"
        exit 1
    fi
    
    log_success "Backend reiniciado com sucesso!"
fi

# Tentar reset via API
log_info "Tentando reset do serviço AD via API..."
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/users/force-reset)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    log_success "Reset via API realizado com sucesso!"
    echo "Resposta: $body"
else
    log_warning "Reset via API falhou (HTTP $http_code)"
    log_info "Tentando reinicialização completa..."
    
    # Reinicialização completa
    docker-compose down
    docker-compose up -d
    
    # Aguardar inicialização
    sleep 15
    
    # Testar novamente
    if curl -s http://localhost:8000/health > /dev/null; then
        log_success "Reinicialização completa realizada com sucesso!"
    else
        log_error "Falha na reinicialização completa"
        exit 1
    fi
fi

# Testar conexão AD
log_info "Testando conexão com AD..."
test_response=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/users/connection-test)
test_code=$(echo "$test_response" | tail -n1)

if [ "$test_code" = "200" ]; then
    log_success "Conexão AD funcionando!"
    echo "Testando criação de usuário..."
    
    # Teste de criação
    create_response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/users/create \
        -H "Content-Type: application/json" \
        -d '{
            "firstName": "Teste",
            "lastName": "Deadlock",
            "loginName": "teste.deadlock.fix",
            "password": "TesteFix@123!"
        }')
    
    create_code=$(echo "$create_response" | tail -n1)
    
    if [ "$create_code" = "201" ] || [ "$create_code" = "200" ]; then
        log_success "Criação de usuário funcionando!"
    else
        log_warning "Criação de usuário ainda com problema (HTTP $create_code)"
    fi
else
    log_error "Conexão AD ainda com problema"
fi

echo
log_info "===== STATUS FINAL ====="
echo "Health Check: $(curl -s http://localhost:8000/health | jq -r '.status' 2>/dev/null || echo 'ERROR')"
echo "Conexão AD: $(curl -s http://localhost:8000/api/v1/users/connection-test | jq -r '.connection_status' 2>/dev/null || echo 'ERROR')"

echo
log_info "Para monitorar logs:"
echo "docker-compose logs -f backend" 