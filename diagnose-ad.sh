#!/bin/bash

# Script para diagnosticar problemas de conexão com AD
# Uso: ./diagnose-ad.sh

echo "🔍 Diagnóstico de Conexão AD"
echo "============================="

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

# Ler configurações do .env
if [ -f "backend/.env" ]; then
    source backend/.env
    log_success "Arquivo .env carregado"
else
    log_error "Arquivo backend/.env não encontrado"
    exit 1
fi

echo
log_info "===== CONFIGURAÇÕES ATUAIS ====="
echo "Servidor AD: $AD_SERVER"
echo "Domínio AD: $AD_DOMAIN"
echo "Base DN: $AD_BASE_DN"
echo "Usuário: $AD_USERNAME"
echo "OU Usuários: $AD_USERS_OU"
echo "SSL: $AD_USE_SSL"

# Extrair IP e porta do servidor
SERVER_IP=$(echo $AD_SERVER | sed 's/ldap:\/\///' | sed 's/:.*//')
SERVER_PORT=$(echo $AD_SERVER | sed 's/.*://')

echo
log_info "===== TESTE DE REDE ====="

# Teste 1: Ping para o servidor
log_info "1. Testando ping para $SERVER_IP..."
if ping -c 3 $SERVER_IP > /dev/null 2>&1; then
    log_success "Ping OK - Servidor responde"
else
    log_error "Ping FALHOU - Servidor não responde"
fi

# Teste 2: Conexão TCP na porta LDAP
log_info "2. Testando conexão TCP para $SERVER_IP:$SERVER_PORT..."
if timeout 5 bash -c "echo > /dev/tcp/$SERVER_IP/$SERVER_PORT" 2>/dev/null; then
    log_success "Conexão TCP OK - Porta LDAP acessível"
else
    log_error "Conexão TCP FALHOU - Porta LDAP não acessível"
fi

# Teste 3: Teste com ldapsearch (se disponível)
echo
log_info "===== TESTE LDAP MANUAL ====="
if command -v ldapsearch &> /dev/null; then
    log_info "3. Testando bind LDAP com ldapsearch..."
    
    # Construir DN de bind
    BIND_DN="$AD_USERNAME@$AD_DOMAIN"
    
    echo "Comando: ldapsearch -x -H $AD_SERVER -D \"$BIND_DN\" -W -b \"$AD_BASE_DN\" -s base"
    
    # Teste sem senha (vai falhar, mas mostra se consegue conectar)
    timeout 10 ldapsearch -x -H $AD_SERVER -D "$BIND_DN" -w "teste" -b "$AD_BASE_DN" -s base 2>&1 | head -10
    
    if [ $? -eq 0 ]; then
        log_success "Conectou ao servidor LDAP (credenciais podem estar incorretas)"
    else
        log_error "Não conseguiu conectar ao servidor LDAP"
    fi
else
    log_warning "ldapsearch não está disponível"
    log_info "Para instalar: apt-get install ldap-utils"
fi

# Teste 4: Verificar DNS
echo
log_info "===== TESTE DNS ====="
log_info "4. Testando resolução DNS..."

# Resolver hostname se for um nome
if [[ $SERVER_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log_info "Usando IP direto: $SERVER_IP"
else
    log_info "Resolvendo hostname: $SERVER_IP"
    RESOLVED_IP=$(nslookup $SERVER_IP | grep -A 1 "Name:" | tail -1 | awk '{print $2}')
    if [ -n "$RESOLVED_IP" ]; then
        log_success "DNS OK - $SERVER_IP resolve para $RESOLVED_IP"
    else
        log_error "DNS FALHOU - Não conseguiu resolver $SERVER_IP"
    fi
fi

# Teste 5: Verificar se é problema de domínio
echo
log_info "===== VERIFICAÇÃO DO DOMÍNIO ====="
log_info "5. Verificando configuração do domínio..."

echo "DN de bind construído: $AD_USERNAME@$AD_DOMAIN"
echo "Base DN: $AD_BASE_DN"
echo "OU de usuários: $AD_USERS_OU"

# Teste 6: Sugestões de correção
echo
log_info "===== SUGESTÕES DE CORREÇÃO ====="

echo "1. Verificar se o servidor AD está rodando:"
echo "   - Acesse o servidor $SERVER_IP diretamente"
echo "   - Verifique se o serviço LDAP está ativo"

echo
echo "2. Verificar credenciais:"
echo "   - Usuário: $AD_USERNAME"
echo "   - Senha: [OCULTA]"
echo "   - Teste login manual no servidor AD"

echo
echo "3. Verificar conectividade de rede:"
echo "   - Firewall entre container e servidor AD"
echo "   - Roteamento de rede correto"

echo
echo "4. Formatos alternativos de DN:"
echo "   - CN=$AD_USERNAME,$AD_BASE_DN"
echo "   - $AD_USERNAME@$AD_DOMAIN (atual)"

echo
echo "5. Testar com SSL/TLS:"
echo "   - Mudar AD_USE_SSL para true"
echo "   - Usar porta 636 em vez de 389"

echo
log_info "===== TESTE BACKEND ====="
log_info "6. Testando conexão via backend..."

# Testar conexão via API
if curl -s http://localhost:8000/health > /dev/null; then
    log_success "Backend está rodando"
    
    # Testar conexão AD
    echo "Testando conexão AD via API..."
    response=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/users/connection-test)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Conexão AD via API funcionou!"
    else
        log_error "Conexão AD via API falhou (HTTP $http_code)"
    fi
else
    log_error "Backend não está rodando"
fi

echo
log_info "===== PRÓXIMOS PASSOS ====="
echo "1. Verificar se o servidor AD está acessível"
echo "2. Confirmar credenciais do usuário de serviço"
echo "3. Testar conectividade de rede"
echo "4. Verificar configuração do domínio"
echo "5. Considerar usar SSL/TLS" 