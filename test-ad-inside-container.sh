#!/bin/bash

# Script para testar formatos DN dentro do container
# Uso: ./test-ad-inside-container.sh

echo "🧪 Teste de Formatos DN (Container)"
echo "==================================="

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

# Verificar se container está rodando
if ! docker ps | grep -q "ad-user-creator-web-backend-1"; then
    log_error "Container backend não está rodando"
    exit 1
fi

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
echo "Senha: [OCULTA]"

# Função para testar formato DN
test_format() {
    local format="$1"
    local description="$2"
    
    echo
    log_info "Testando: $description"
    echo "Formato: $format"
    
    # Criar script de teste no container
    docker exec ad-user-creator-web-backend-1 bash -c "cat > /tmp/test-dn.js << 'EOF'
const ldap = require('ldapjs');

const client = ldap.createClient({
    url: '$AD_SERVER',
    timeout: 10000,
    connectTimeout: 10000
});

let connected = false;

client.on('error', (err) => {
    if (!connected) {
        console.log('❌ Erro na conexão:', err.message);
        process.exit(1);
    }
});

client.on('connect', () => {
    connected = true;
    console.log('✅ Conectado ao servidor LDAP');
    
    client.bind('$format', '$AD_PASSWORD', (err) => {
        if (err) {
            console.log('❌ Erro no bind:', err.message);
            console.log('❌ Código:', err.code || 'N/A');
            console.log('❌ Formato falhou:', '$format');
        } else {
            console.log('✅ BIND REALIZADO COM SUCESSO!');
            console.log('✅ Formato correto:', '$format');
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
EOF"

    # Executar teste
    docker exec ad-user-creator-web-backend-1 node /tmp/test-dn.js 2>&1
    
    # Limpar arquivo
    docker exec ad-user-creator-web-backend-1 rm -f /tmp/test-dn.js
}

# Testar diferentes formatos
echo
log_info "===== TESTANDO FORMATOS DE DN ====="

# Formato 1: UPN (User Principal Name) - Atual
test_format "$AD_USERNAME@$AD_DOMAIN" "UPN - User Principal Name (atual)"

# Formato 2: UPN com domínio em maiúsculo
test_format "$AD_USERNAME@$(echo $AD_DOMAIN | tr '[:lower:]' '[:upper:]')" "UPN com domínio em maiúsculo"

# Formato 3: NetBIOS Domain\Username
NETBIOS_DOMAIN=$(echo $AD_DOMAIN | cut -d'.' -f1 | tr '[:lower:]' '[:upper:]')
test_format "$NETBIOS_DOMAIN\\\\$AD_USERNAME" "NetBIOS Domain\\Username"

# Formato 4: sAMAccountName simples
test_format "$AD_USERNAME" "sAMAccountName simples"

# Formato 5: CN no Base DN
test_format "CN=$AD_USERNAME,$AD_BASE_DN" "CN no Base DN"

# Formato 6: CN na OU Users padrão
test_format "CN=$AD_USERNAME,CN=Users,$AD_BASE_DN" "CN na OU Users padrão"

# Formato 7: CN na OU configurada (se diferente do Base DN)
if [ "$AD_USERS_OU" != "$AD_BASE_DN" ]; then
    test_format "CN=$AD_USERNAME,$AD_USERS_OU" "CN na OU configurada"
fi

# Formato 8: CN em possível OU de Service Accounts
test_format "CN=$AD_USERNAME,CN=Service Accounts,$AD_BASE_DN" "CN em Service Accounts"
test_format "CN=$AD_USERNAME,OU=Service Accounts,$AD_BASE_DN" "CN em OU Service Accounts"

# Formato 9: Variações do domínio
test_format "CN=$AD_USERNAME,CN=Users,DC=TELESPAZIO,DC=local" "CN Users específico"
test_format "CN=$AD_USERNAME,OU=Users,DC=TELESPAZIO,DC=local" "OU Users específico"

echo
log_info "===== RESULTADOS DO TESTE ====="
echo "Procure por mensagens '✅ BIND REALIZADO COM SUCESSO!' acima"
echo "O formato que funcionou deve ser usado no backend/.env"

echo
log_info "===== PRÓXIMOS PASSOS ====="
echo "1. Identificar o formato de DN que funcionou"
echo "2. Atualizar backend/.env com a configuração correta"
echo "3. Reiniciar o backend: docker-compose restart backend"
echo "4. Testar criação de usuário novamente"

echo
log_info "===== TESTANDO CRIAÇÃO APÓS IDENTIFICAR FORMATO ====="
echo "Após encontrar o formato correto, teste:"
echo "curl -X POST http://localhost:8000/api/v1/users/create \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"firstName\":\"Teste\",\"lastName\":\"Formato\",\"loginName\":\"teste.formato\",\"password\":\"Teste@123!\"}'" 