# 🎯 Quiz Arena

> Web-Version des deutschen Quizspiels "Der große Preis" mit Echtzeit-Multiplayer

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)

## ✨ Features

- **Mehrere Teams** - 2-4 Teams spielen gleichzeitig
- **Echtzeit-Updates** - Live Punktestände für alle
- **Risiko & Joker** - Originale Spielmechaniken
- **Admin-Panel** - Eigene Fragen und Kategorien
- **Vollbild-Modus** - Perfekt für Präsentationen

## 🚀 Installation

### Voraussetzungen
- Bun oder Node.js
- PostgreSQL
- Redis

### Setup
```bash
# Repository klonen
git clone https://github.com/username/quiz-arena.git
cd quiz-arena

# Backend
cd backend
bun install
cp .env.example .env
# .env anpassen

# Frontend  
cd ../frontend
bun install

# Datenbank
createdb quiz_game
bun run migrate
```

### Starten
```bash
# Backend (Terminal 1)
cd backend && bun run dev

# Frontend (Terminal 2)  
cd frontend && bun start
```

Öffne http://localhost:3000

## 🎮 Wie spielen?

1. **Spiel erstellen** → Spielcode erhalten
2. **Teams beitreten** → Code eingeben
3. **Kategorien wählen** → Fragen beantworten
4. **Joker nutzen** → Strategische Vorteile
5. **Risiko wagen** → Punkte setzen

## 🛠 Tech Stack

- **Frontend:** React + TypeScript + Socket.IO
- **Backend:** Bun + Express + PostgreSQL
- **Echtzeit:** WebSockets
- **Deployment:** Docker

## 📁 Struktur

```
quiz-arena/
├── frontend/     # React App
├── backend/      # Bun Server  
├── database/     # SQL Schema
└── docker/       # Container Config
```

## 🐳 Docker

```bash
# Einfacher Start
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork das Repo
2. Feature Branch erstellen
3. Änderungen committen  
4. Pull Request öffnen

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

---

Entwickelt für Quiz-Fans 🎲