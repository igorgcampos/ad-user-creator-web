#!/bin/bash

# Script para testar criação de usuários em diferentes OUs
# Uso: ./test-user-creation-ous.sh

echo "🧪 Teste de Criação em Diferentes OUs"
echo "====================================="

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

# Carregar configurações
if [ -f "backend/.env" ]; then
    source backend/.env
    log_success "Arquivo .env carregado"
else
    log_error "Arquivo backend/.env não encontrado"
    exit 1
fi

echo
log_info "===== CONFIGURAÇÕES ATUAIS ====="
echo "Servidor: $AD_SERVER"
echo "Domínio: $AD_DOMAIN"
echo "Base DN: $AD_BASE_DN"
echo "Usuário: $AD_USERNAME"
echo "OU Atual: $AD_USERS_OU"

# Backup do .env
cp backend/.env backend/.env.test-backup
log_info "Backup criado: backend/.env.test-backup"

# Função para testar OU
test_ou() {
    local ou="$1"
    local description="$2"
    
    echo
    log_info "===== TESTANDO: $description ====="
    log_info "OU: $ou"
    
    # Atualizar .env
    sed -i "s|AD_USERS_OU=.*|AD_USERS_OU=$ou|" backend/.env
    
    # Reiniciar backend
    docker-compose restart backend > /dev/null 2>&1
    sleep 8
    
    # Testar connection-test primeiro
    connection_test=$(curl -s -w "%{http_code}" http://localhost:8000/api/v1/users/connection-test)
    
    if [ "$connection_test" != "200" ]; then
        log_error "Connection-test falhou para: $ou"
        return 1
    fi
    
    # Testar criação de usuário
    local test_user="teste$(date +%s)"
    
    create_response=$(timeout 25 curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/users/create \
        -H "Content-Type: application/json" \
        -d "{
            \"firstName\": \"Teste\",
            \"lastName\": \"OU\",
            \"loginName\": \"$test_user\",
            \"password\": \"TesteOU@123!\"
        }")
    
    create_code=$(echo "$create_response" | tail -n1)
    create_body=$(echo "$create_response" | sed '$d')
    
    if [ "$create_code" = "201" ] || [ "$create_code" = "200" ]; then
        log_success "✅ CRIAÇÃO FUNCIONOU na OU: $ou"
        echo "Resposta: $create_body"
        return 0
    elif [ "$create_code" = "409" ]; then
        log_warning "Usuário já existe (pode ser normal)"
        log_success "✅ CRIAÇÃO FUNCIONA na OU: $ou"
        return 0
    else
        log_error "❌ Criação falhou na OU: $ou (HTTP $create_code)"
        echo "Resposta: $create_body"
        return 1
    fi
}

# Lista de OUs para testar
declare -a ous_to_test=(
    "CN=Users,DC=TELESPAZIO,DC=local"
    "OU=Users,DC=TELESPAZIO,DC=local"
    "OU=Service Accounts,DC=TELESPAZIO,DC=local"
    "OU=Services,DC=TELESPAZIO,DC=local"
    "OU=TPZ.BR,DC=TELESPAZIO,DC=local"
    "OU=Users,OU=TPZ.BR,DC=TELESPAZIO,DC=local"
    "OU=Service Accounts,OU=TPZ.BR,DC=TELESPAZIO,DC=local"
    "OU=Services,OU=TPZ.BR,DC=TELESPAZIO,DC=local"
    "OU=Administrators,DC=TELESPAZIO,DC=local"
    "OU=Computers,DC=TELESPAZIO,DC=local"
    "DC=TELESPAZIO,DC=local"
)

# Testar cada OU
working_ous=()
failed_ous=()

for ou in "${ous_to_test[@]}"; do
    if test_ou "$ou" "$(echo $ou | cut -d',' -f1)"; then
        working_ous+=("$ou")
    else
        failed_ous+=("$ou")
    fi
done

echo
log_info "===== RESULTADOS FINAIS ====="

if [ ${#working_ous[@]} -gt 0 ]; then
    echo
    log_success "✅ OUs QUE FUNCIONARAM:"
    for ou in "${working_ous[@]}"; do
        echo "  - $ou"
    done
    
    # Usar a primeira OU que funcionou
    best_ou="${working_ous[0]}"
    log_success "Configurando OU padrão: $best_ou"
    
    # Atualizar .env com a OU que funciona
    sed -i "s|AD_USERS_OU=.*|AD_USERS_OU=$best_ou|" backend/.env
    
    # Reiniciar backend
    docker-compose restart backend > /dev/null 2>&1
    sleep 8
    
    # Teste final
    echo
    log_info "===== TESTE FINAL COM OU CORRETA ====="
    final_response=$(timeout 20 curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/users/create \
        -H "Content-Type: application/json" \
        -d '{
            "firstName": "João",
            "lastName": "Silva",
            "loginName": "joao.silva.final",
            "password": "MinhaSenh@123!"
        }')
    
    final_code=$(echo "$final_response" | tail -n1)
    final_body=$(echo "$final_response" | sed '$d')
    
    if [ "$final_code" = "201" ] || [ "$final_code" = "200" ]; then
        log_success "🎉 PROBLEMA RESOLVIDO! Usuário criado com sucesso!"
        echo "Resposta: $final_body"
        echo
        echo "✅ OU correta encontrada: $best_ou"
        echo "✅ Configuração salva em backend/.env"
    elif [ "$final_code" = "409" ]; then
        log_success "🎉 PROBLEMA RESOLVIDO! (Usuário já existe)"
        echo "✅ OU correta encontrada: $best_ou"
        echo "✅ Configuração salva em backend/.env"
    else
        log_error "Teste final falhou (HTTP $final_code)"
        echo "Resposta: $final_body"
    fi
    
else
    echo
    log_error "❌ NENHUMA OU FUNCIONOU"
    echo "Isso indica problema de permissões do usuário $AD_USERNAME"
    echo
    echo "Verifique no servidor AD:"
    echo "1. Se o usuário $AD_USERNAME existe"
    echo "2. Se tem permissões para criar usuários"
    echo "3. Se pertence aos grupos corretos (Domain Admins, Account Operators)"
    echo
    echo "Comandos para testar no servidor AD:"
    echo "Get-ADUser -Identity '$AD_USERNAME' | Format-List"
    echo "Get-ADUser -Identity '$AD_USERNAME' | Select-Object MemberOf"
fi

if [ ${#failed_ous[@]} -gt 0 ]; then
    echo
    log_warning "❌ OUs que falharam:"
    for ou in "${failed_ous[@]}"; do
        echo "  - $ou"
    done
fi

echo
log_info "===== CONFIGURAÇÃO FINAL ====="
echo "Arquivo backend/.env:"
grep -E "^AD_" backend/.env

echo
log_info "===== BACKUPS DISPONÍVEIS ====="
echo "Backup original: backend/.env.backup"
echo "Backup deste teste: backend/.env.test-backup"
echo
echo "Para reverter: cp backend/.env.backup backend/.env && docker-compose restart backend" 