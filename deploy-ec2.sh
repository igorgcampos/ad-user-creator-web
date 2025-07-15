#!/bin/bash

# =============================================================================
# Script de Deploy para EC2 AWS
# =============================================================================

echo "🚀 Iniciando deploy do AD User Creator na EC2..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado!"
    echo "Instale o Docker primeiro:"
    echo "curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "sudo sh get-docker.sh"
    echo "sudo usermod -aG docker \$USER"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado!"
    echo "Instale o Docker Compose:"
    echo "sudo curl -L \"https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

# Configurar variáveis de ambiente
log "Configurando variáveis de ambiente..."
if [ ! -f .env ]; then
    log "Copiando env.example para .env..."
    cp env.example .env
    warn "⚠️  Lembre-se de ajustar as variáveis no arquivo .env conforme necessário!"
fi

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Limpar imagens antigas (opcional)
read -p "Deseja limpar imagens Docker antigas? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Limpando imagens antigas..."
    docker system prune -f
fi

# Build das imagens
log "Fazendo build das imagens..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    error "Erro no build das imagens!"
    exit 1
fi

# Iniciar serviços
log "Iniciando serviços..."
docker-compose up -d

if [ $? -ne 0 ]; then
    error "Erro ao iniciar os serviços!"
    exit 1
fi

# Aguardar serviços ficarem prontos
log "Aguardando serviços ficarem prontos..."
sleep 30

# Verificar status dos serviços
log "Verificando status dos serviços..."
docker-compose ps

# Testar endpoints
log "Testando endpoints..."

# Obter IP público da EC2
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "44.222.181.172")

# Testar backend
if curl -s "http://localhost:8000/health" > /dev/null; then
    log "✅ Backend está funcionando!"
    log "📡 API disponível em: http://$EC2_IP:8000"
    log "📖 Documentação em: http://$EC2_IP:8000/api/v1/docs"
else
    warn "⚠️  Backend pode estar iniciando ainda. Verificar logs:"
    echo "docker-compose logs backend"
fi

# Testar frontend
if curl -s "http://localhost:3000" > /dev/null; then
    log "✅ Frontend está funcionando!"
    log "🌐 Aplicação disponível em: http://$EC2_IP:3000"
else
    warn "⚠️  Frontend pode estar iniciando ainda. Verificar logs:"
    echo "docker-compose logs frontend"
fi

echo ""
log "🎉 Deploy concluído!"
echo ""
echo "📋 URLs importantes:"
echo "   Frontend: http://$EC2_IP:3000"
echo "   Backend:  http://$EC2_IP:8000"
echo "   API Docs: http://$EC2_IP:8000/api/v1/docs"
echo ""
echo "📊 Comandos úteis:"
echo "   Ver logs:        docker-compose logs -f"
echo "   Parar serviços:  docker-compose down"
echo "   Status:          docker-compose ps"
echo "   Restart:         docker-compose restart"
echo ""
warn "⚠️  Certifique-se de que as portas 3000 e 8000 estão abertas no Security Group!"
echo "" 