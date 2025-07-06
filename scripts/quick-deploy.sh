#!/bin/bash

# Quiz Arena Quick Production Deployment Script
# Für schnelles Setup auf einem frischen Server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 Quiz Arena - Quick Production Deployment"
echo "==========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Bitte nicht als root ausführen! Verwende einen normalen Benutzer mit sudo-Rechten."
    exit 1
fi

# Check sudo access
if ! sudo -n true 2>/dev/null; then
    print_error "Sudo-Rechte erforderlich. Bitte 'sudo visudo' verwenden um NOPASSWD zu setzen oder Passwort eingeben."
fi

# Update system
print_status "System wird aktualisiert..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw

# Install Docker
print_status "Docker wird installiert..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installiert"
else
    print_success "Docker bereits installiert"
fi

# Install Docker Compose
print_status "Docker Compose wird installiert..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installiert"
else
    print_success "Docker Compose bereits installiert"
fi

# Configure firewall
print_status "Firewall wird konfiguriert..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
print_success "Firewall konfiguriert"

# Generate secure passwords
print_status "Sichere Passwörter werden generiert..."
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Create .env file
print_status "Produktions-Konfiguration wird erstellt..."
cat > .env << EOF
# Quiz Arena Production Configuration
# Generated on $(date)

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=quiz_arena
DB_USER=quiz_user
DB_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Application Configuration
NODE_ENV=production
PORT=3001

# Frontend Configuration (Update with your domain!)
VITE_API_URL=http://$(curl -s ifconfig.me):3001
VITE_SOCKET_URL=http://$(curl -s ifconfig.me):3001

# Port Configuration
FRONTEND_PORT=3000
BACKEND_PORT=3001
EOF

print_success "Konfiguration erstellt"

# Create necessary directories
print_status "Verzeichnisse werden erstellt..."
mkdir -p backend/logs
mkdir -p backups
mkdir -p nginx/logs
mkdir -p nginx/ssl

# Make scripts executable
chmod +x scripts/*.sh

# Start production deployment
print_status "Produktions-Deployment wird gestartet..."
./scripts/setup.sh prod

# Wait for services
print_status "Warte auf Services..."
sleep 30

# Check service health
print_status "Service-Status wird geprüft..."
if curl -f http://localhost:3001/health &> /dev/null; then
    print_success "Backend ist erreichbar"
else
    print_warning "Backend-Health-Check fehlgeschlagen"
fi

if curl -f http://localhost:3000 &> /dev/null; then
    print_success "Frontend ist erreichbar"
else
    print_warning "Frontend-Health-Check fehlgeschlagen"
fi

# Show deployment info
echo ""
print_success "🎉 Quiz Arena Deployment abgeschlossen!"
echo ""
echo "📋 Deployment-Informationen:"
echo "=============================="
echo "🌐 Externe IP: $(curl -s ifconfig.me)"
echo "📱 Frontend: http://$(curl -s ifconfig.me):3000"
echo "🔧 Backend: http://$(curl -s ifconfig.me):3001"
echo "🗄️  Database: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo ""
echo "🔐 Generierte Passwörter (SICHER AUFBEWAHREN!):"
echo "Database: $DB_PASSWORD"
echo "Redis: $REDIS_PASSWORD"
echo "JWT Secret: $JWT_SECRET"
echo ""
echo "📁 Konfiguration gespeichert in: .env"
echo ""
echo "🔧 Nützliche Befehle:"
echo "  - Status prüfen: docker-compose -f docker-compose.prod.yml ps"
echo "  - Logs anzeigen: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Backup erstellen: ./scripts/backup.sh"
echo "  - Update durchführen: ./scripts/update.sh prod"
echo "  - Services neustarten: docker-compose -f docker-compose.prod.yml restart"
echo "  - Services stoppen: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "⚠️  WICHTIG:"
echo "  1. Passwörter aus der Ausgabe oben sicher speichern!"
echo "  2. Domain in .env anpassen wenn verfügbar"
echo "  3. SSL-Zertifikat einrichten für HTTPS"
echo "  4. Automatische Backups einrichten (siehe DEPLOYMENT.md)"
echo ""

# Check if reboot needed for Docker group
if ! groups | grep -q docker; then
    print_warning "NEUANMELDUNG ERFORDERLICH: Bitte ab- und wieder anmelden damit Docker-Gruppe aktiv wird"
    echo "Danach können Sie Docker-Befehle ohne sudo verwenden."
fi

print_success "Deployment erfolgreich abgeschlossen! 🚀"