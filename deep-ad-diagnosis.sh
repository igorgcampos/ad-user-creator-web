#!/bin/bash

# Script para diagnóstico profundo do AD
# Uso: ./deep-ad-diagnosis.sh

echo "🔬 Diagnóstico Profundo do AD"
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
echo "OU Configurada: $AD_USERS_OU"

# Instalar ldap-utils
echo
log_info "===== INSTALANDO LDAP-UTILS ====="
if ! command -v ldapsearch &> /dev/null; then
    log_info "Instalando ldap-utils..."
    sudo apt-get update -qq
    sudo apt-get install -y ldap-utils
    
    if command -v ldapsearch &> /dev/null; then
        log_success "ldap-utils instalado com sucesso"
    else
        log_error "Falha ao instalar ldap-utils"
        exit 1
    fi
else
    log_success "ldap-utils já instalado"
fi

# Função para testar bind LDAP
test_ldap_bind() {
    local bind_dn="$1"
    local description="$2"
    
    echo
    log_info "Testando bind: $description"
    echo "DN: $bind_dn"
    
    # Testar bind
    timeout 10 ldapsearch -x -H "$AD_SERVER" -D "$bind_dn" -w "$AD_PASSWORD" -b "$AD_BASE_DN" -s base "(objectClass=*)" dn 2>&1 | head -5
    
    if [ $? -eq 0 ]; then
        log_success "Bind funcionou: $bind_dn"
        return 0
    else
        log_error "Bind falhou: $bind_dn"
        return 1
    fi
}

# Função para procurar usuário no AD
search_user() {
    local search_base="$1"
    local description="$2"
    
    echo
    log_info "Procurando usuário: $description"
    echo "Base: $search_base"
    
    # Procurar usuário
    timeout 15 ldapsearch -x -H "$AD_SERVER" -D "$AD_USERNAME@$AD_DOMAIN" -w "$AD_PASSWORD" \
        -b "$search_base" -s sub "(sAMAccountName=$AD_USERNAME)" dn 2>&1 | head -10
    
    if [ $? -eq 0 ]; then
        log_success "Busca funcionou em: $search_base"
        return 0
    else
        log_error "Busca falhou em: $search_base"
        return 1
    fi
}

echo
log_info "===== TESTE 1: VERIFICAR BIND BÁSICO ====="
test_ldap_bind "$AD_USERNAME@$AD_DOMAIN" "UPN padrão"

echo
log_info "===== TESTE 2: PROCURAR USUÁRIO NO AD ====="

# Procurar em diferentes OUs
search_user "$AD_BASE_DN" "Base DN completa"
search_user "CN=Users,$AD_BASE_DN" "OU Users padrão"
search_user "OU=Users,$AD_BASE_DN" "OU Users alternativa"
search_user "OU=Service Accounts,$AD_BASE_DN" "OU Service Accounts"
search_user "OU=Services,$AD_BASE_DN" "OU Services"
search_user "$AD_USERS_OU" "OU configurada"

echo
log_info "===== TESTE 3: VERIFICAR PERMISSÕES ESPECÍFICAS ====="

# Testar operações específicas
echo
log_info "Testando busca de usuários na OU configurada..."
timeout 15 ldapsearch -x -H "$AD_SERVER" -D "$AD_USERNAME@$AD_DOMAIN" -w "$AD_PASSWORD" \
    -b "$AD_USERS_OU" -s sub "(objectClass=user)" sAMAccountName 2>&1 | head -15

echo
log_info "Testando busca de OUs disponíveis..."
timeout 15 ldapsearch -x -H "$AD_SERVER" -D "$AD_USERNAME@$AD_DOMAIN" -w "$AD_PASSWORD" \
    -b "$AD_BASE_DN" -s sub "(objectClass=organizationalUnit)" dn 2>&1 | grep -E "^dn:" | head -10

echo
log_info "===== TESTE 4: VERIFICAR GRUPO DE USUÁRIOS ====="
log_info "Verificando grupos do usuário $AD_USERNAME..."
timeout 15 ldapsearch -x -H "$AD_SERVER" -D "$AD_USERNAME@$AD_DOMAIN" -w "$AD_PASSWORD" \
    -b "$AD_BASE_DN" -s sub "(sAMAccountName=$AD_USERNAME)" memberOf 2>&1 | head -10

echo
log_info "===== TESTE 5: TESTAR CRIAÇÃO MANUAL ====="
log_info "Tentando criar entrada de teste manualmente..."

# Criar LDIF para teste
cat > /tmp/test-user.ldif << EOF
dn: CN=TesteManual,CN=Users,$AD_BASE_DN
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: user
cn: TesteManual
sn: Manual
givenName: Teste
sAMAccountName: testemanual
userPrincipalName: testemanual@$AD_DOMAIN
displayName: Teste Manual
userAccountControl: 512
EOF

log_info "Tentando adicionar usuário de teste..."
timeout 15 ldapadd -x -H "$AD_SERVER" -D "$AD_USERNAME@$AD_DOMAIN" -w "$AD_PASSWORD" -f /tmp/test-user.ldif 2>&1

# Remover arquivo temporário
rm -f /tmp/test-user.ldif

echo
log_info "===== TESTE 6: VERIFICAR SCHEMA E CAPACIDADES ====="
log_info "Verificando schema do servidor..."
timeout 10 ldapsearch -x -H "$AD_SERVER" -D "$AD_USERNAME@$AD_DOMAIN" -w "$AD_PASSWORD" \
    -b "" -s base "(objectClass=*)" subschemaSubentry 2>&1 | head -5

echo
log_info "===== RESULTADO E SUGESTÕES ====="
echo
echo "1. Se o usuário $AD_USERNAME foi encontrado em uma OU diferente:"
echo "   - Atualize AD_USERS_OU no backend/.env"
echo "   - Use o DN exato mostrado acima"

echo
echo "2. Se o bind básico funcionou mas criação falhou:"
echo "   - Usuário não tem permissões para criar usuários"
echo "   - Verifique grupos: Domain Admins, Account Operators"

echo
echo "3. Se nenhuma busca funcionou:"
echo "   - Problema de permissões de leitura"
echo "   - Verificar configuração do usuário no AD"

echo
echo "4. Se criação manual funcionou:"
echo "   - Problema específico com o código da aplicação"
echo "   - OU configurada está incorreta"

echo
echo "5. Para corrigir:"
echo "   - Identificar OU correta onde o usuário pode criar"
echo "   - Atualizar backend/.env com a OU correta"
echo "   - Verificar permissões do usuário $AD_USERNAME"

echo
log_info "===== COMANDOS PARA TESTAR NO SERVIDOR AD ====="
echo
echo "No servidor AD ($AD_SERVER), execute:"
echo "Get-ADUser -Identity '$AD_USERNAME' | Format-List"
echo "Get-ADUser -Identity '$AD_USERNAME' | Select-Object DistinguishedName"
echo "Get-ADUser -Identity '$AD_USERNAME' | Select-Object MemberOf"
echo
echo "Para verificar permissões:"
echo "Get-ADUser '$AD_USERNAME' | Get-ADPermission"
echo "Get-ADOrganizationalUnit '$AD_USERS_OU' | Get-ADPermission | Where-Object {$_.IdentityReference -like '*$AD_USERNAME*'}" 