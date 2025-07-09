# 🚀 Quiz Arena - Vollautomatisches Deployment

## Ein-Klick-Deployment ohne .env oder manuelle SQL-Migrationen!

### 🎯 Einfachste Nutzung

```bash
# Alles starten
./start.sh

# Mit Debug-Tools (Adminer)
docker-compose -f docker-compose.auto.yml --profile debug up -d
```

**Das war's!** 🎉

### 📋 Was passiert automatisch?

1. **PostgreSQL** startet und führt automatisch alle SQL-Dateien aus:
   - `01-schema.sql` → Grundstruktur
   - `02-indexes.sql` → Performance-Optimierung  
   - `03-add-ownership-and-permissions.sql` → Berechtigungssystem

2. **Backend** wird gebaut und startet im Produktionsmodus

3. **Frontend** wird gebaut und über Nginx bereitgestellt

4. **Health Checks** sorgen für korrekte Startreihenfolge

### 🔧 Verfügbare Services

| Service | URL | Beschreibung |
|---------|-----|--------------|
| Frontend | http://localhost:3000 | Hauptanwendung |
| Backend API | http://localhost:3001 | REST API |
| Adminer | http://localhost:8080 | DB-Management (nur mit `--profile debug`) |

### 📊 Datenbank-Zugang

- **Host:** localhost:5432
- **Database:** quiz_arena  
- **User:** quiz_user
- **Password:** quiz_password_123

### 🛠️ Erweiterte Befehle

```bash
# Alles zurücksetzen (Daten löschen)
./start.sh --reset

# Images neu bauen
./start.sh --rebuild

# Logs anschauen
docker-compose -f docker-compose.auto.yml logs -f

# Nur bestimmten Service anschauen
docker-compose -f docker-compose.auto.yml logs -f backend

# Services stoppen
docker-compose -f docker-compose.auto.yml down

# Mit Volumes löschen
docker-compose -f docker-compose.auto.yml down -v

# Status prüfen
docker-compose -f docker-compose.auto.yml ps
```

### 🔄 Wie funktionieren automatische SQL-Migrationen?

PostgreSQL führt beim ersten Start automatisch alle `.sql`-Dateien im `/docker-entrypoint-initdb.d/` Verzeichnis aus:

```
backend/src/database/
├── 01-schema.sql              → /docker-entrypoint-initdb.d/01-schema.sql
├── 02-indexes.sql             → /docker-entrypoint-initdb.d/02-indexes.sql  
└── 03-add-ownership-and-permissions.sql → /docker-entrypoint-initdb.d/03-permissions.sql
```

**Reihenfolge:** Alphabetisch (01, 02, 03...)

### ➕ Neue SQL-Migration hinzufügen

1. **Datei erstellen:**
```bash
touch backend/src/database/04-new-feature.sql
```

2. **SQL schreiben:**
```sql
-- 04-new-feature.sql
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
```

3. **Container neu starten:**
```bash
./start.sh --reset  # Löscht DB und führt alle Migrationen aus
```

### 🏭 Produktions-Deployment

Für echte Produktion:

1. **Passwörter ändern** in `docker-compose.auto.yml`
2. **JWT_SECRET ändern**
3. **CLIENT_URL anpassen**
4. **HTTPS konfigurieren** (Reverse Proxy)

```bash
# Produktions-Variablen setzen
sed -i 's/quiz_password_123/SUPER_SECURE_PASSWORD/g' docker-compose.auto.yml
sed -i 's/quiz-arena-super-secret-jwt-key-change-in-production-2024/YOUR_REAL_JWT_SECRET/g' docker-compose.auto.yml
```

### 🐛 Troubleshooting

#### Container startet nicht
```bash
# Logs prüfen
docker-compose -f docker-compose.auto.yml logs backend

# Container debuggen
docker-compose -f docker-compose.auto.yml exec backend sh
```

#### Datenbank-Probleme
```bash
# DB-Container neu starten
docker-compose -f docker-compose.auto.yml restart postgres

# In DB einloggen
docker-compose -f docker-compose.auto.yml exec postgres psql -U quiz_user -d quiz_arena
```

#### Port-Konflikte
```bash
# Verwendete Ports prüfen
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :5432
```

### 🔐 Sicherheit

**Entwicklung:** Alle Passwörter sind Standard-Werte
**Produktion:** ALLE Passwörter und Secrets ändern!

### 📈 Monitoring

```bash
# Resource-Verbrauch
docker stats

# Service-Health
curl http://localhost:3001/api/health

# DB-Status
docker-compose -f docker-compose.auto.yml exec postgres pg_isready -U quiz_user
```

---

## 🎯 Fazit

**Ein Befehl, alles läuft:**
```bash
./start.sh
```

Keine .env-Dateien, keine manuellen Migrationen, keine Konfiguration! 🚀