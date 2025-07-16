#!/bin/bash

# Script de teste para o backend AD User Creator
# Autor: AI Assistant
# Data: 2025-07-16

echo "🧪 Teste do Backend AD User Creator"
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

# Função para testar endpoint
test_endpoint() {
    local method="$1"
    local url="$2"
    local data="$3"
    local description="$4"
    
    echo
    log_info "Testando: $description"
    echo "Método: $method"
    echo "URL: $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        log_success "Status: $http_code"
        echo "Resposta: $body"
    else
        log_error "Status: $http_code"
        echo "Resposta: $body"
    fi
    
    echo "----------------------------------------"
}

# Verificar se o backend está rodando
log_info "Verificando se o backend está rodando..."
if ! curl -s http://localhost:8000/health > /dev/null; then
    log_error "Backend não está respondendo em http://localhost:8000"
    log_info "Execute: docker-compose up -d"
    exit 1
fi

log_success "Backend está rodando!"

# Aguardar logs do backend
log_info "Aguardando logs do backend em tempo real..."
log_info "Pressione Ctrl+C para sair dos logs"
echo

# Inicia logs do backend em background
docker-compose logs -f backend &
LOGS_PID=$!

# Aguarda um pouco para ver logs de inicialização
sleep 2

echo
log_info "Iniciando testes dos endpoints..."

# Teste 1: Health check
test_endpoint "GET" "http://localhost:8000/health" "" "Health Check"

# Teste 2: Informações da API
test_endpoint "GET" "http://localhost:8000/" "" "Informações da API"

# Teste 3: Teste de conexão AD
test_endpoint "GET" "http://localhost:8000/api/v1/users/connection-test" "" "Teste de Conexão AD"

# Teste 4: Verificar se usuário existe
test_endpoint "GET" "http://localhost:8000/api/v1/users/exists/teste.usuario" "" "Verificar Usuário Existente"

# Teste 5: Criar usuário
user_data='{
    "firstName": "João",
    "lastName": "Silva",
    "loginName": "joao.silva.test",
    "password": "MinhaSenh@123!"
}'

test_endpoint "POST" "http://localhost:8000/api/v1/users/create" "$user_data" "Criar Usuário"

# Teste 6: Verificar se usuário foi criado
test_endpoint "GET" "http://localhost:8000/api/v1/users/exists/joao.silva.test" "" "Verificar Usuário Criado"

# Teste 7: Obter informações do usuário
test_endpoint "GET" "http://localhost:8000/api/v1/users/info/joao.silva.test" "" "Informações do Usuário"

# Teste 8: Sugerir nome de usuário
test_endpoint "GET" "http://localhost:8000/api/v1/users/suggest-username/Maria/Santos" "" "Sugerir Username"

# Teste 9: Validar senha
password_data='{"password": "MinhaSenh@123!"}'
test_endpoint "POST" "http://localhost:8000/api/v1/users/validate-password" "$password_data" "Validar Senha"

echo
log_success "Todos os testes concluídos!"
log_info "Verifique os logs acima para detalhes das operações"

# Para os logs do backend
kill $LOGS_PID 2>/dev/null

echo
log_info "Para ver apenas os logs do backend:"
echo "docker-compose logs -f backend" 