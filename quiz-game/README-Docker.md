# 🐳 Quiz Arena - Docker Development Setup

## Quick Start

```bash
# Start everything
./start-dev.sh

# Stop everything
./stop-dev.sh
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React/Vite Development Server |
| Backend | http://localhost:3001 | Node.js/Bun API Server |
| Database | localhost:5432 | PostgreSQL Database |
| Redis | localhost:6379 | Redis Cache |
| pgAdmin | http://localhost:8080 | Database Management UI |

## First Time Setup

1. **Start the environment**
   ```bash
   ./start-dev.sh
   ```

2. **Open the frontend**
   - Go to http://localhost:5173
   - You'll be redirected to the setup wizard

3. **Create first admin user**
   - Username: your choice (3-30 chars, letters/numbers/underscore/hyphen)
   - Email: valid email format
   - Password: min 8 chars, uppercase, lowercase, number

4. **Start using the admin panel**
   - Create categories
   - Add questions
   - Manage users
   - Create games

## Development Workflow

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Database Management

**Via pgAdmin (GUI):**
- URL: http://localhost:8080
- Email: admin@quiz-arena.local
- Password: admin123
- Add server: Host=postgres, User=quiz_user, Password=quiz_password_123

**Via Command Line:**
```bash
# Connect to database
docker-compose exec postgres psql -U quiz_user -d quiz_arena

# Run SQL file
docker-compose exec postgres psql -U quiz_user -d quiz_arena -f /docker-entrypoint-initdb.d/sample-questions.sql
```

### Fresh Database
```bash
# Stop and remove volumes
docker-compose down -v

# Start again (will recreate database)
docker-compose up -d
```

## File Structure

```
quiz-game/
├── docker-compose.yml          # Main orchestration
├── start-dev.sh               # Start script
├── stop-dev.sh                # Stop script
├── backend/
│   ├── Dockerfile             # Backend container
│   └── src/database/
│       ├── 01-schema.sql      # Auto-loaded schema
│       └── 02-indexes.sql     # Auto-loaded indexes
└── frontend/
    └── Dockerfile.dev         # Frontend dev container
```

## Troubleshooting

### Port Conflicts
If ports are already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "5174:5173"  # Change left side
```

### Database Issues
```bash
# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER quiz-game/
```

### Clean Slate
```bash
# Remove everything and start fresh
docker-compose down -v --rmi all
docker system prune -a
./start-dev.sh
```

## Production Deployment

For production, create:
- `docker-compose.prod.yml`
- Proper environment variables
- SSL certificates
- Reverse proxy (nginx)
- Backup strategies

## Environment Variables

All configuration is in `docker-compose.yml`. For custom settings:

1. Copy `.env.docker` to `.env`
2. Modify values
3. Restart: `docker-compose down && docker-compose up -d`