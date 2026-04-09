# Quiz2Quiz — Démarrage rapide

## 1) Prérequis
- Node.js 20+
- npm 10+

## 2) PostgreSQL local (sans Docker)
1. Installe PostgreSQL sur ta machine.
2. Crée la base:
   ```sql
   CREATE DATABASE quiz2quiz;
   ```
3. Vérifie que l'URL est correcte dans `backend/.env`:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quiz2quiz`
4. Active PostgreSQL dans le backend:
   - `USE_POSTGRES=true`
5. (Optionnel) Appliquer manuellement le schéma:
   ```bash
   psql postgresql://postgres:postgres@localhost:5432/quiz2quiz -f backend/sql/schema.sql
   ```

## 3) Variables d'environnement
Les deux dossiers contiennent maintenant un `.env` prêt à l'emploi.

### Backend (`backend/.env`)
Variables principales:
- `PORT` (par défaut `3000`)
- `FRONTEND_URL` (par défaut `http://localhost:4200`)
- `COOKIE_SECURE` (`false` en local)
- `USE_POSTGRES` (`true` pour activer PostgreSQL)
- `DATABASE_URL` (chaîne de connexion PostgreSQL)

### Frontend (`frontend/.env`)
Variables principales:
- `NG_APP_API_URL` (par défaut `http://localhost:3000/api`)

## 4) Installer les dépendances
```bash
cd backend && npm install
cd ../frontend && npm install
```

## 5) Lancer le backend
```bash
cd backend
npm run start:dev
```
API: `http://localhost:3000/api`
Swagger: `http://localhost:3000/api/docs`

## Tester les APIs avec exemples
- Ouvre `http://localhost:3000/api/docs`
- Chaque endpoint contient:
  - un exemple de payload (`requestBody`)
  - un exemple de réponse (`responses`)
  - les paramètres (`path`, `query`, `headers`)

## 6) Lancer le frontend
```bash
cd frontend
npm start
```
App: `http://localhost:4200`

## 7) Workflow rapide
1. Ouvrir l'app frontend.
2. Créer un compte (`/auth/register`).
3. Créer ou rejoindre un salon (`/home`).
4. Vérifier les endpoints sur Swagger (`/api/docs`).
