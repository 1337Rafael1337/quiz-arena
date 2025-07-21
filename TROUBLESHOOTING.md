# 🔧 Quiz Arena - Troubleshooting Guide

Häufige Probleme und deren Lösungen.

## 🚨 Häufige Probleme

### 1. "Spiel nicht gefunden" beim Beitreten

**Problem:** Spiel wurde im Admin-Panel erstellt, aber beim Beitreten kommt "Spiel nicht gefunden".

**Ursache:** Das Spiel existiert in der Datenbank, aber nicht im Socket.IO GameEngine.

**Lösung:** ✅ **Automatisch behoben** - Das System lädt Spiele automatisch aus der DB.

**Manueller Check:**
```bash
# Prüfe ob Spiel in DB existiert
docker-compose exec postgres psql -U quiz_user -d quiz_arena -c "SELECT game_code, name, status FROM game_sessions WHERE status IN ('waiting', 'active');"

# Backend-Logs prüfen
docker-compose logs backend | grep "Game loaded from DB"
```

### 2. API-Calls schlagen fehl (ERR_CONNECTION_REFUSED)

**Problem:** Frontend zeigt `GET http://localhost:3001/api/... net::ERR_CONNECTION_REFUSED`

**Ursache:** Frontend versucht direkt auf Backend zuzugreifen statt über nginx-Proxy.

**Lösung:**
```bash
# Frontend neu bauen (behebt hardcoded URLs)
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

**Prüfung:**
```bash
# API über nginx testen
wget -q --spider http://localhost:3000/api/health && echo "✅ API erreichbar" || echo "❌ API nicht erreichbar"
```

### 3. CORS-Fehler beim Zugriff über IP-Adresse

**Problem:** Zugriff über `http://192.168.x.x:3000` funktioniert nicht.

**Ursache:** IP-Adresse nicht in ALLOWED_ORIGINS.

**Lösung:**
```bash
# IP-Adresse zu CORS hinzufügen
# In docker-compose.yml:
ALLOWED_ORIGINS: http://localhost:3000,http://127.0.0.1:3000,http://YOUR_IP:3000

# Backend neu starten
docker-compose restart backend
```

### 4. Setup-Wizard erscheint nicht

**Problem:** Erwarte Setup-Wizard, aber sehe Login-Seite.

**Ursache:** Admin-User existiert bereits.

**Prüfung:**
```bash
# Admin-User prüfen
docker-compose exec postgres psql -U quiz_user -d quiz_arena -c "SELECT username, role FROM users WHERE role = 'admin';"
```

**Reset (falls gewünscht):**
```bash
# ACHTUNG: Löscht alle User!
docker-compose exec postgres psql -U quiz_user -d quiz_arena -c "DELETE FROM users;"
```

### 5. Frontend zeigt alte Version

**Problem:** Änderungen sind nicht sichtbar.

**Lösung:**
```bash
# Browser-Cache leeren
# Ctrl+Shift+R (Hard Refresh)
# Oder Inkognito-Modus

# Frontend neu bauen
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### 6. Datenbank-Verbindungsfehler

**Problem:** Backend kann nicht zur DB verbinden.

**Prüfung:**
```bash
# DB-Status prüfen
docker-compose ps postgres
docker-compose logs postgres

# Verbindung testen
docker-compose exec postgres pg_isready -U quiz_user -d quiz_arena
```

**Lösung:**
```bash
# DB neu starten
docker-compose restart postgres

# Komplett neu (ACHTUNG: Datenverlust!)
docker-compose down -v
docker-compose up -d
```

## 🔍 Debug-Befehle

### Service-Status prüfen
```bash
docker-compose ps
docker-compose logs --tail=20 backend
docker-compose logs --tail=20 frontend
```

### Netzwerk-Konnektivität
```bash
# API-Erreichbarkeit
wget -q --spider http://localhost:3000/api/health && echo "✅ API OK" || echo "❌ API Fehler"

# Socket.IO-Verbindung (im Browser F12 Console)
# Sollte "✅ Connected to server" zeigen
```

### Datenbank-Debugging
```bash
# In DB einloggen
docker-compose exec postgres psql -U quiz_user -d quiz_arena

# Wichtige Tabellen prüfen
\dt
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM game_sessions;
SELECT COUNT(*) FROM questions;
```

### Container-Debugging
```bash
# In Container einloggen
docker-compose exec backend sh
docker-compose exec frontend sh

# Resource-Verbrauch
docker stats

# Logs live verfolgen
docker-compose logs -f backend
```

## 🚀 Performance-Tipps

### 1. Speicher optimieren
```bash
# Ungenutzte Images löschen
docker system prune -a

# Nur Quiz Arena behalten
docker-compose down
docker system prune -a
docker-compose up -d
```

### 2. Startup beschleunigen
```bash
# Services parallel starten
docker-compose up -d postgres redis
sleep 10
docker-compose up -d backend frontend
```

## 🔧 Entwickler-Tools

### Git-Konfiguration
```bash
# Dateiberechtigungen ignorieren (Windows/WSL)
git config core.filemode false
```

### Hot-Reload-Probleme
```bash
# Development-Setup verwenden
cd quiz-game
./start-dev.sh

# Statt Production-Setup
docker-compose up -d  # (Root-Verzeichnis)
```

## 📞 Support

Wenn diese Lösungen nicht helfen:

1. **Logs sammeln:**
   ```bash
   docker-compose logs > quiz-arena-logs.txt
   ```

2. **System-Info:**
   ```bash
   docker version
   docker-compose version
   uname -a
   ```

3. **Issue erstellen** mit Logs und System-Info

---

**Letzte Aktualisierung:** Nach den Fixes vom $(date +%Y-%m-%d)