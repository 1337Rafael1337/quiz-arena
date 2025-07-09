#!/bin/bash

# Quiz Arena - Vollautomatisches Deployment
# Einfach ausführen: ./start.sh

set -e

echo "🚀 Quiz Arena - Vollautomatisches Deployment"
echo "=============================================="

# Prüfen ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker ist nicht gestartet. Bitte Docker starten und erneut versuchen."
    exit 1
fi

# Prüfen ob docker-compose verfügbar ist
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose nicht gefunden. Bitte installieren."
    exit 1
fi

echo "✅ Docker ist bereit"

# Alte Container stoppen (falls vorhanden)
echo "🛑 Stoppe alte Container..."
docker-compose -f docker-compose.auto.yml down --remove-orphans 2>/dev/null || true

# Volumes löschen bei --reset
if [ "$1" = "--reset" ]; then
    echo "🗑️  Lösche alle Daten (Volumes)..."
    docker-compose -f docker-compose.auto.yml down -v
    docker volume prune -f
fi

# Images neu bauen bei --rebuild
if [ "$1" = "--rebuild" ] || [ "$1" = "--reset" ]; then
    echo "🔨 Baue Images neu..."
    docker-compose -f docker-compose.auto.yml build --no-cache
fi

# Container starten
echo "🚀 Starte Quiz Arena..."
docker-compose -f docker-compose.auto.yml up -d

# Warten bis alles läuft
echo "⏳ Warte auf Services..."
sleep 10

# Status prüfen
echo "📊 Service Status:"
docker-compose -f docker-compose.auto.yml ps

# Health Check
echo "🏥 Health Check..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend ist bereit!"
        break
    fi
    echo "   Warte auf Backend... ($i/30)"
    sleep 2
done

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend ist bereit!"
else
    echo "⚠️  Frontend noch nicht bereit, aber startet..."
fi

echo ""
echo "🎉 Quiz Arena ist gestartet!"
echo "================================"
echo "🌐 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:3001"
echo "🗄️  Adminer:  http://localhost:8080 (mit --profile debug)"
echo ""
echo "📋 Nützliche Befehle:"
echo "   ./start.sh --reset     # Alles zurücksetzen"
echo "   ./start.sh --rebuild   # Images neu bauen"
echo "   docker-compose -f docker-compose.auto.yml logs -f"
echo "   docker-compose -f docker-compose.auto.yml down"
echo ""
echo "🔐 Standard Admin-Login wird beim ersten Start erstellt"
echo "   Gehe zu: http://localhost:3000/setup"