# Quiz2Quiz — Démarrage rapide

## 1) Prérequis
- Node.js 20+
- npm 10+

## 2) Variables d'environnement
Les deux dossiers contiennent maintenant un `.env` prêt à l'emploi.

### Backend (`backend/.env`)
Variables principales:
- `PORT` (par défaut `3000`)
- `FRONTEND_URL` (par défaut `http://localhost:4200`)
- `COOKIE_SECURE` (`false` en local)

### Frontend (`frontend/.env`)
Variables principales:
- `NG_APP_API_URL` (par défaut `http://localhost:3000/api`)

## 3) Installer les dépendances
```bash
cd backend && npm install
cd ../frontend && npm install
```

## 4) Lancer le backend
```bash
cd backend
npm run start:dev
```
API: `http://localhost:3000/api`
Swagger: `http://localhost:3000/api/docs`

## 5) Lancer le frontend
```bash
cd frontend
npm start
```
App: `http://localhost:4200`

## 6) Workflow rapide
1. Ouvrir l'app frontend.
2. Créer un compte (`/auth/register`).
3. Créer ou rejoindre un salon (`/home`).
4. Vérifier les endpoints sur Swagger (`/api/docs`).
