# 🏗️ Quiz Arena - Architektur-Dokumentation

## 📋 Überblick

Quiz Arena verwendet eine moderne Microservice-ähnliche Architektur mit klarer Trennung zwischen Admin-Interface und Spiel-Engine.

## 🎯 Zwei-System-Architektur

### 1. **Admin-System (Persistent)**
- **Zweck:** Spiel-Management, User-Verwaltung, Content-Management
- **Storage:** PostgreSQL Datenbank
- **API:** REST-Endpoints (`/api/admin/*`, `/api/user/*`)
- **Features:**
  - Spiele erstellen (`game_sessions` Tabelle)
  - Fragen/Kategorien verwalten
  - User-Management
  - Statistiken

### 2. **Game-Engine (In-Memory)**
- **Zweck:** Live-Spiel-Durchführung, Echtzeit-Interaktion
- **Storage:** In-Memory (GameEngine Klasse)
- **API:** Socket.IO WebSockets
- **Features:**
  - Team-Management
  - Live-Scoring
  - Echtzeit-Updates
  - Joker-System

## 🔗 System-Integration

### Database-to-Memory Bridge
```typescript
// Automatisches Laden von DB-Spielen in GameEngine
socket.on('join_game', async (data) => {
  let game = gameEngine.getGame(gameCode)
  
  if (!game) {
    // Lade aus Datenbank
    const dbGame = await loadFromDatabase(gameCode)
    gameEngine.createGameFromDB(dbGame)
    game = gameEngine.getGame(gameCode)
  }
})
```

**Workflow:**
1. Admin erstellt Spiel → DB (`game_sessions`)
2. Player joint Spiel → Socket.IO prüft GameEngine
3. Nicht gefunden → Automatisches Laden aus DB
4. Spiel läuft in GameEngine (Memory)

## 🌐 Network Architecture

### Production Setup (nginx Reverse Proxy)
```
Internet → nginx:80 → {
  /api/* → backend:3001
  /socket.io/* → backend:3001  
  /* → static files
}
```

### Development Setup (Direct Access)
```
Frontend:5173 → backend:3001 (direct)
pgAdmin:8080 → postgres:5432
```

## 🗄️ Datenbank-Schema

### Kern-Tabellen
```sql
users                 -- Admin/User-Accounts
├── game_sessions     -- Erstellte Spiele
├── questions         -- Fragen-Pool
├── question_categories -- Kategorien
├── question_options  -- Antwort-Optionen
└── teams            -- Spiel-Teams (persistent)
```

### Permissions-System
```sql
game_permissions     -- Wer darf welches Spiel verwalten
question_permissions -- Wer darf welche Fragen bearbeiten
```

## 🔄 Data Flow

### Spiel-Erstellung
```
Admin Panel → REST API → PostgreSQL → game_sessions
```

### Spiel-Beitritt
```
Join Form → Socket.IO → GameEngine.getGame()
                     ↓ (if not found)
                   PostgreSQL → createGameFromDB() → GameEngine
```

### Live-Spiel
```
Player Action → Socket.IO → GameEngine → Broadcast → All Players
```

## 🚀 Deployment-Strategien

### Development
```yaml
services:
  frontend: Dockerfile.dev (Hot-Reload)
  backend: Volume-Mount + bun dev
  postgres: Direct access :5432
  redis: Direct access :6379
```

### Production  
```yaml
services:
  frontend: nginx + static build
  backend: Optimized build, internal only
  postgres: Internal network only
  redis: Internal network only
```

## 🔐 Security Model

### Authentication
- **JWT-Tokens** für API-Zugriff
- **Role-based** (admin/user)
- **Setup-Wizard** für Initial-Admin

### Network Security
- **nginx Reverse Proxy** (Production)
- **CORS-Protection** mit konfigurierbaren Origins
- **Internal Networks** für Service-Kommunikation

### Data Protection
- **SQL-Injection-Schutz** via Prepared Statements
- **Input-Sanitization** für alle User-Inputs
- **Permission-System** für Resource-Zugriff

## 📊 Performance Considerations

### Memory Management
- **GameEngine:** Spiele werden bei Inaktivität automatisch entfernt
- **Database Pooling:** Effiziente DB-Verbindungen
- **Redis Caching:** Session-Management

### Scalability
- **Horizontal:** Mehrere Backend-Instanzen möglich
- **Database:** PostgreSQL mit Indexing-Optimierung
- **Frontend:** Statische Files über CDN möglich

## 🔧 Development Patterns

### Error Handling
```typescript
// Consistent error responses
socket.emit('error', { message: 'User-friendly message' })
res.status(400).json({ error: 'Detailed error info' })
```

### API Design
```typescript
// RESTful endpoints
GET    /api/admin/games     // List games
POST   /api/admin/games     // Create game
PUT    /api/admin/games/:id // Update game
DELETE /api/admin/games/:id // Delete game
```

### Socket.IO Events
```typescript
// Consistent event naming
socket.on('join_game', handler)
socket.on('select_question', handler)
socket.emit('game_state_updated', data)
```

## 🎯 Future Improvements

### Potential Enhancements
1. **Redis Game State:** Persistent game state zwischen Restarts
2. **Microservices:** Separate Game-Engine Service
3. **Load Balancing:** Multiple Backend-Instanzen
4. **Real-time Analytics:** Live-Statistiken
5. **Mobile App:** Native iOS/Android Apps

### Technical Debt
- [ ] Unified Game Storage (DB + Memory)
- [ ] Better Error Handling in Socket.IO
- [ ] API Rate Limiting
- [ ] Automated Testing Suite

---

**Letzte Aktualisierung:** $(date +%Y-%m-%d) - Nach Architektur-Refactoring