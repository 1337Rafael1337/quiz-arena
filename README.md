# Quiz Arena

Echtzeit-Multiplayer-Quizspiel im Stil von "Der große Preis". Teams wählen Fragen aus einem Kategorien-Raster, beantworten sie unter Zeitdruck und sammeln Punkte. Unterstützt Joker, RISIKO-Fragen und verschiedene Spielmodi.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 19, TypeScript, Vite, Zustand, Socket.IO Client |
| Backend | Bun, Express 5, Socket.IO, JWT Auth |
| Datenbank | PostgreSQL 16 |
| Deployment | Docker Compose, Nginx |

## Architektur

```
quiz-game/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express + Socket.IO Server
│   │   ├── config.ts              # Env-Validierung
│   │   ├── models/
│   │   │   └── GameEngine.ts      # Spiellogik (State Machine)
│   │   ├── routes/
│   │   │   ├── admin.ts           # Admin-API (CRUD, Import, User-Mgmt)
│   │   │   └── gamemaster.ts      # Gamemaster-API (eigene Spiele/Fragen)
│   │   └── database/
│   │       ├── schema.sql          # DDL
│   │       ├── migrations/         # Inkrementelle Migrationen
│   │       ├── migrate.ts          # Migration Runner
│   │       └── seed.ts             # Beispieldaten
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── GameScreen.tsx      # Spielansicht (Grid, Fragen, Timer)
│   │   │   ├── admin/             # Admin Panel (Fragen, Kategorien, Spiele, Import, User)
│   │   │   └── gamemaster/        # Gamemaster Panel (eigene Inhalte)
│   │   ├── store/gameStore.ts     # Zustand Store (Socket State)
│   │   └── lib/                   # API Client, QR Modal, Theme Toggle
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

## Spielmodi

- **Spielmodus** (`game_mode`): `self_service` (Teams wählen selbst) oder `quizmaster` (Spielleiter steuert)
- **Antwortmodus** (`answer_mode`): `competitive` (alle Teams gleichzeitig) oder `turns` (Reihum, ein Team pro Runde)
- **RISIKO**: Doppelte Punkte bei richtig, Punktverlust bei falsch
- **Joker**: 50:50 (zwei falsche Antworten eliminieren), konfigurierbare Anzahl pro Team

## Rollen

| Rolle | Berechtigungen |
|---|---|
| Admin | Globale Kategorien/Fragen, alle Spiele verwalten, User-Management, CSV-Import |
| Gamemaster | Eigene Kategorien/Fragen erstellen, eigene Spiele starten |
| Spieler | Team beitreten, Fragen beantworten |

## Setup

### Voraussetzungen

- Bun >= 1.2
- PostgreSQL 16
- Node.js 20+ (alternativ zu Bun)

### Entwicklung

```bash
cd quiz-game

# Datenbank anlegen
createdb quiz_arena

# Backend
cd backend
bun install
cp .env.example .env    # Anpassen: DB_PASSWORD, JWT_SECRET
bun run migrate
bun run dev             # Port 3001

# Frontend (neues Terminal)
cd frontend
bun install
bun run dev             # Port 5173
```

### Docker (Production)

```bash
cd quiz-game

# .env anlegen (mindestens):
# DB_PASSWORD=...
# JWT_SECRET=...
# CLIENT_URL=https://deine-domain.de

docker compose up -d
```

Erreichbar unter Port `8080` (Nginx) → Backend auf `3001`.

### Migrationen

```bash
cd quiz-game/backend
bun run migrate         # Führt alle ausstehenden Migrationen aus
```

## CSV Import

Format für Massenimport von Fragen:

```csv
category,question,answer1,answer2,answer3,answer4,correct_answer,points,time_limit,is_risiko
Geographie,Hauptstadt von Deutschland?,Berlin,München,Hamburg,Köln,1,100,30,false
```

- `correct_answer`: 1-4 (Index der richtigen Antwort)
- `points`: 100-500
- `time_limit`: Sekunden
- Kategorien werden automatisch erstellt falls nicht vorhanden
- UTF-8 mit BOM empfohlen (Excel-Kompatibilität)

## Features
- Mehrere Teams - 2-4 Teams spielen gleichzeitig
- Risiko & Joker - Originale Spielmechaniken
- Dark/Light Mode mit persistenter Auswahl
- QR-Code-Generierung für Spiel-Beitritt
- Spectator/Beamer-Modus (ohne Interaktion)
- Responsive Design (Mobile bis 4K)
- Rate Limiting und Helmet Security Headers
- Cookie-basierte JWT-Authentifizierung (HttpOnly, SameSite)
- Automatische Turn-Rotation im Reihum-Modus


## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)