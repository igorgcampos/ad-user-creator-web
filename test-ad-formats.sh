#!/bin/bash

# Script para testar diferentes formatos de DN do AD
# Uso: ./test-ad-formats.sh

echo "🧪 Teste de Formatos DN do AD"
echo "=============================="

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
echo "Servidor: $AD_SERVER"
echo "Domínio: $AD_DOMAIN"
echo "Base DN: $AD_BASE_DN"
echo "Usuário: $AD_USERNAME"
echo "OU: $AD_USERS_OU"

# Função para testar um formato específico
test_format() {
    local format="$1"
    local description="$2"
    
    echo
    log_info "Testando: $description"
    echo "Formato: $format"
    
    # Criar arquivo temporário para teste
    cat > /tmp/test-format.js << EOF
const ldap = require('ldapjs');

const client = ldap.createClient({
    url: '$AD_SERVER',
    timeout: 10000,
    connectTimeout: 10000
});

client.on('error', (err) => {
    console.log('❌ Erro na conexão:', err.message);
    process.exit(1);
});

client.on('connect', () => {
    console.log('✅ Conectado ao servidor LDAP');
    
    client.bind('$format', '$AD_PASSWORD', (err) => {
        if (err) {
            console.log('❌ Erro no bind:', err.message);
            console.log('❌ Código:', err.code || 'N/A');
        } else {
            console.log('✅ Bind realizado com sucesso!');
        }
        
        client.unbind(() => {
            console.log('✅ Desconectado');
            process.exit(0);
        });
    });
});

setTimeout(() => {
    console.log('❌ Timeout após 10 segundos');
    process.exit(1);
}, 10000);
EOF

    # Executar teste no container
    docker exec -i ad-user-creator-web-backend-1 node /tmp/test-format.js 2>&1 | head -5
    
    # Limpar arquivo temporário
    rm -f /tmp/test-format.js
}

# Testar diferentes formatos de DN
echo
log_info "===== TESTANDO FORMATOS DE DN ====="

# Formato 1: UPN (User Principal Name)
test_format "$AD_USERNAME@$AD_DOMAIN" "UPN - User Principal Name (atual)"

# Formato 2: CN no contexto do usuário
test_format "CN=$AD_USERNAME,$AD_BASE_DN" "CN no Base DN"

# Formato 3: CN em uma OU de usuários
test_format "CN=$AD_USERNAME,CN=Users,$AD_BASE_DN" "CN na OU Users padrão"

# Formato 4: CN na OU configurada
if [ "$AD_USERS_OU" != "$AD_BASE_DN" ]; then
    test_format "CN=$AD_USERNAME,$AD_USERS_OU" "CN na OU configurada"
fi

# Formato 5: sAMAccountName simples
test_format "$AD_USERNAME" "sAMAccountName simples"

# Formato 6: Com domínio NetBIOS
NETBIOS_DOMAIN=$(echo $AD_DOMAIN | cut -d'.' -f1 | tr '[:lower:]' '[:upper:]')
test_format "$NETBIOS_DOMAIN\\$AD_USERNAME" "NetBIOS Domain\\Username"

# Formato 7: UPN com domínio em maiúsculo
test_format "$AD_USERNAME@$(echo $AD_DOMAIN | tr '[:lower:]' '[:upper:]')" "UPN com domínio em maiúsculo"

echo
log_info "===== TESTE MANUAL COM LDAPSEARCH ====="

# Instalar ldap-utils se não estiver disponível
if ! command -v ldapsearch &> /dev/null; then
    log_info "Instalando ldap-utils..."
    apt-get update -qq && apt-get install -y ldap-utils
fi

# Testar com ldapsearch
if command -v ldapsearch &> /dev/null; then
    log_info "Testando com ldapsearch..."
    
    echo "Comando que será executado:"
    echo "ldapsearch -x -H $AD_SERVER -D \"$AD_USERNAME@$AD_DOMAIN\" -w \"[SENHA]\" -b \"$AD_BASE_DN\" -s base"
    
    # Teste básico (vai falhar por senha, mas mostra se conecta)
    timeout 10 ldapsearch -x -H $AD_SERVER -D "$AD_USERNAME@$AD_DOMAIN" -w "senhaerrada" -b "$AD_BASE_DN" -s base 2>&1 | head -10
else
    log_warning "ldapsearch não disponível"
fi

echo
log_info "===== VERIFICAÇÕES ADICIONAIS ====="

# Verificar se o servidor está respondendo
log_info "Verificando conectividade TCP..."
SERVER_IP=$(echo $AD_SERVER | sed 's/ldap:\/\///' | sed 's/:.*//')
SERVER_PORT=$(echo $AD_SERVER | sed 's/.*://')

if timeout 5 bash -c "echo > /dev/tcp/$SERVER_IP/$SERVER_PORT" 2>/dev/null; then
    log_success "Porta LDAP acessível"
else
    log_error "Porta LDAP não acessível"
fi

# Verificar DNS
log_info "Verificando DNS..."
if nslookup $SERVER_IP > /dev/null 2>&1; then
    log_success "DNS OK"
else
    log_warning "Problema de DNS"
fi

echo
log_info "===== SUGESTÕES BASEADAS NOS TESTES ====="

echo "1. Se nenhum formato funcionou:"
echo "   - Verificar se o servidor AD está rodando"
echo "   - Verificar credenciais do usuário $AD_USERNAME"
echo "   - Verificar conectividade de rede"

echo
echo "2. Se alguns formatos funcionaram:"
echo "   - Atualizar backend/.env com o formato correto"
echo "   - Reiniciar o backend"

echo
echo "3. Formatos comuns para testar:"
echo "   - svc_user_creator@TELESPAZIO.local"
echo "   - TELESPAZIO\\svc_user_creator"
echo "   - CN=svc_user_creator,CN=Users,DC=TELESPAZIO,DC=local"
echo "   - CN=svc_user_creator,OU=Service Accounts,DC=TELESPAZIO,DC=local"

echo
echo "4. Verificar no servidor AD:"
echo "   - Propriedades do usuário $AD_USERNAME"
echo "   - Distinguished Name (DN) exato"
echo "   - User Principal Name (UPN)"
echo "   - sAMAccountName"

echo
log_info "===== PRÓXIMOS PASSOS ====="
echo "1. Identificar o formato de DN que funcionou"
echo "2. Atualizar backend/.env com as configurações corretas"
echo "3. Reiniciar o backend: docker-compose restart backend"
echo "4. Testar criação de usuário novamente" 