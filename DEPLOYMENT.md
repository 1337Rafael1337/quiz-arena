# 🚀 Quiz Arena Deployment Guide

Dieses Dokument erklärt, wie Quiz Arena professionell deployed wird, inklusive Datenbankmigrationen.

## 📋 Inhaltsverzeichnis

1. [Deployment-Methoden](#deployment-methoden)
2. [Datenbankmigrationen](#datenbankmigrationen)
3. [Produktions-Deployment](#produktions-deployment)
4. [Docker-Deployment](#docker-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Troubleshooting](#troubleshooting)

## 🎯 Deployment-Methoden

### 1. Lokale Entwicklung
```bash
# Einfaches Setup für Entwicklung
./scripts/deploy.sh development
```

### 2. Produktions-Deployment
```bash
# Vollständiges Produktions-Deployment
./scripts/deploy.sh production
```

### 3. Docker-Deployment
```bash
# Mit Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🗄️ Datenbankmigrationen

### Migration-System

Quiz Arena verwendet ein professionelles Migrationssystem:

```
quiz-game/backend/src/database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_permissions.sql
│   └── ...
├── migrator.ts
└── connection.ts
```

### Migration-Befehle

```bash
# Alle ausstehenden Migrationen ausführen
bun run migrate

# Migration-Status anzeigen
bun run migrate:status

# Rollback (falls implementiert)
bun run migrate:rollback

# Mit Script
./scripts/migrate.sh migrate
./scripts/migrate.sh status
```

### Neue Migration erstellen

1. **Datei erstellen:**
```bash
# Format: XXX_description.sql
touch quiz-game/backend/src/database/migrations/003_add_new_feature.sql
```

2. **Migration schreiben:**
```sql
-- Migration 003: Add New Feature
-- Description of what this migration does

-- Add new table
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add new column to existing table
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(50);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('003_add_new_feature') 
ON CONFLICT (version) DO NOTHING;
```

3. **Migration testen:**
```bash
# Lokal testen
bun run migrate:status
bun run migrate
```

## 🏭 Produktions-Deployment

### Vorbereitung

1. **Environment-Datei erstellen:**
```bash
cp quiz-game/.env.production.example quiz-game/.env.production
# Bearbeite die Werte entsprechend deiner Umgebung
```

2. **Sicherheitscheck:**
- JWT_SECRET mindestens 32 Zeichen
- Starke Datenbankpasswörter
- CORS richtig konfiguriert
- HTTPS aktiviert

### Deployment-Prozess

```bash
# 1. Code aktualisieren
git pull origin main

# 2. Dependencies installieren
cd quiz-game/backend && bun install
cd ../frontend && bun install

# 3. Migrationen ausführen
cd ../backend && bun run migrate

# 4. Frontend bauen
cd ../frontend && bun run build

# 5. Backend bauen
cd ../backend && bun run build

# 6. Anwendung starten
bun run start
```

### Automatisiertes Deployment

```bash
# Alles in einem Befehl
./scripts/deploy.sh production
```

## 🐳 Docker-Deployment

### Produktions-Setup

1. **Environment-Datei:**
```bash
cp quiz-game/.env.production.example .env
# Bearbeite die Werte
```

2. **Docker Compose starten:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Logs überwachen:**
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Migration-Handling in Docker

Migrationen werden automatisch beim Container-Start ausgeführt:

```dockerfile
# Im Backend-Container
command: >
  sh -c "
    echo 'Running migrations...' &&
    bun run migrate &&
    echo 'Starting application...' &&
    bun run start
  "
```

## 🔄 CI/CD Pipeline

### GitHub Actions Beispiel

```yaml
# .github/workflows/deploy.yml
name: Deploy Quiz Arena

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      
    - name: Install dependencies
      run: |
        cd quiz-game/backend && bun install
        cd ../frontend && bun install
        
    - name: Run tests
      run: |
        cd quiz-game/backend && bun test
        
    - name: Build application
      run: |
        cd quiz-game/backend && bun run build
        cd ../frontend && bun run build
        
    - name: Deploy to production
      run: |
        # Deine Deployment-Logik hier
        ./scripts/deploy.sh production
```

### Migration-Strategien

#### 1. **Zero-Downtime Migrations**
```sql
-- Sichere Migrationen ohne Downtime
-- 1. Neue Spalte hinzufügen (nullable)
ALTER TABLE users ADD COLUMN new_field VARCHAR(50);

-- 2. Daten migrieren (in separatem Script)
UPDATE users SET new_field = 'default_value' WHERE new_field IS NULL;

-- 3. Constraint hinzufügen (in nächster Migration)
ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;
```

#### 2. **Rollback-Strategien**
```sql
-- Immer reversible Änderungen planen
-- Beispiel: Spalte umbenennen
-- Migration Up:
ALTER TABLE users RENAME COLUMN old_name TO new_name;

-- Migration Down (für Rollback):
ALTER TABLE users RENAME COLUMN new_name TO old_name;
```

## 🔧 Troubleshooting

### Häufige Probleme

#### 1. **Migration schlägt fehl**
```bash
# Status prüfen
bun run migrate:status

# Logs anschauen
docker-compose logs backend

# Manuell reparieren
psql -h localhost -U quizuser -d quizdb
```

#### 2. **Datenbankverbindung fehlgeschlagen**
```bash
# Verbindung testen
pg_isready -h localhost -p 5432 -U quizuser

# Environment prüfen
echo $DB_HOST $DB_PORT $DB_USER
```

#### 3. **Container startet nicht**
```bash
# Logs prüfen
docker-compose logs -f backend

# Container debuggen
docker-compose exec backend sh
```

### Migration-Rollback

```bash
# Manuelle Rollback-Schritte
# 1. Anwendung stoppen
docker-compose stop backend

# 2. Datenbank-Backup wiederherstellen
pg_restore -h localhost -U quizuser -d quizdb backup.sql

# 3. Alte Version deployen
git checkout previous-version
./scripts/deploy.sh production
```

## 📊 Monitoring

### Deployment-Status prüfen

```bash
# Anwendungsstatus
curl http://localhost:3001/api/health

# Datenbankstatus
bun run migrate:status

# Docker-Status
docker-compose ps
```

### Logs

```bash
# Backend-Logs
docker-compose logs -f backend

# Datenbank-Logs
docker-compose logs -f postgres

# Alle Logs
docker-compose logs -f
```

## 🔐 Sicherheit

### Produktions-Checkliste

- [ ] JWT_SECRET geändert (mindestens 32 Zeichen)
- [ ] Datenbankpasswörter stark und einzigartig
- [ ] CORS richtig konfiguriert
- [ ] HTTPS aktiviert
- [ ] Firewall konfiguriert
- [ ] Backup-Strategie implementiert
- [ ] Monitoring eingerichtet
- [ ] Log-Rotation konfiguriert

### Backup-Strategie

```bash
# Automatisches Backup
pg_dump -h localhost -U quizuser quizdb > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup wiederherstellen
pg_restore -h localhost -U quizuser -d quizdb backup.sql
```

---

## 📞 Support

Bei Problemen:
1. Logs prüfen (`docker-compose logs`)
2. Migration-Status prüfen (`bun run migrate:status`)
3. Dokumentation konsultieren
4. Issue auf GitHub erstellen