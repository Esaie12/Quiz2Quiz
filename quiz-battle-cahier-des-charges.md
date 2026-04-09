# Cahier des charges — Quiz Battle Web (Multijoueur en ligne)

> Version : 3.0
> Date : avril 2026
> Statut : Spécification technique finale V1
> Stack : **Angular 17+** · **NestJS 10+** · **Prisma** · **PostgreSQL** · **Redis** · **Socket.IO** · **JWT**

---

## Sommaire

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Workflow général](#2-workflow-général)
3. [Authentification — Flux complet](#3-authentification--flux-complet)
4. [Acteurs et rôles](#4-acteurs-et-rôles)
5. [Architecture technique](#5-architecture-technique)
6. [Backend NestJS — Architecture Service/Controller](#6-backend-nestjs--architecture-servicecontroller)
   - 6.1 [Module Auth](#61-module-auth)
   - 6.2 [Module Users](#62-module-users)
   - 6.3 [Module Rooms](#63-module-rooms)
   - 6.4 [Module Game](#64-module-game)
   - 6.5 [Module Questions](#65-module-questions)
   - 6.6 [Module Redis](#66-module-redis)
7. [Schéma Prisma — Base de données](#7-schéma-prisma--base-de-données)
8. [Frontend Angular — Architecture](#8-frontend-angular--architecture)
9. [Communication temps réel — Socket.IO + NestJS Gateway](#9-communication-temps-réel--socketio--nestjs-gateway)
10. [Modes de jeu et options](#10-modes-de-jeu-et-options)
11. [Système de scoring](#11-système-de-scoring)
12. [Banques de questions](#12-banques-de-questions)
13. [Sécurité et contraintes](#13-sécurité-et-contraintes)
14. [Évolutions futures (V2)](#14-évolutions-futures-v2)

---

## 1. Contexte et objectifs

### Contexte

Le projet **Quiz Battle** existe sous forme d'un fichier HTML local permettant à 2 joueurs de s'affronter sur le même appareil. Ce document spécifie sa transformation en application web complète avec authentification, permettant à deux joueurs identifiés de s'affronter à distance, en temps réel.

### Objectifs V1

- Système d'**inscription / connexion** avec JWT (Access Token + Refresh Token)
- Permettre à deux joueurs authentifiés de jouer en temps réel via WebSocket
- Conserver **l'intégralité des fonctionnalités** du jeu local
- Système de **création/rejoindre une partie** via un code de salon
- Persistance des utilisateurs via **Prisma + PostgreSQL**
- État des salons en temps réel via **Redis**
- Expérience fluide sur **mobile et desktop**

### Fonctionnalités de jeu héritées conservées

| Fonctionnalité | Détail |
|---|---|
| Battle bar TikTok | Barre centrale animée, avatars, scores temps réel |
| Mode Battle | Questions différentes pour chaque joueur |
| Mode Quiz | Questions communes, premier à répondre fait avancer |
| Chronomètre | Compte à rebours configurable (1/2/3/5/10 min) |
| Bonus de rapidité | +10 pts (0–2 s) / +5 pts (3–5 s) |
| Mode Warrior | Séries : ×3 → +15 · ×6 → +30 · ×10 → +100 |
| 3 niveaux de difficulté | Facile (+1 pt) / Normal (+2 pts) / Expert (+3 pts) |
| Pénalité mode Quiz | −1 pt si mauvaise réponse |
| Popups bonus animés | +10 / +5 / +15 / +30 / +100 / −1 |
| Badge streak 🔥 | Couleur évolutive selon le palier |
| Sons procéduraux | Web Audio API — bips de fin de chrono |

---

## 2. Workflow général

### Schéma global

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION WEB                          │
│                                                                 │
│  [/auth/login] ou [/auth/register]                              │
│       │  JWT Access Token stocké (memory) + Refresh (cookie)   │
│       ↓                                                         │
│  [/ Accueil]  ← utilisateur authentifié                        │
│       │                                                         │
│       ├──→ "Créer une partie"  ──→  [/room/:code]              │
│       │         (Hôte)               Code: TIGER7 📋            │
│       │                                                         │
│       └──→ "Rejoindre"  ──→ saisit code  ──→  [/room/:code]   │
│               (Guest)                                           │
│                                                                 │
│  [Salon d'attente /room/:code]                                  │
│       │  Hôte configure · Guest se marque prêt                 │
│       │  Countdown 3…2…1…GO                                    │
│       ↓                                                         │
│  [/room/:code/game]  ←── WebSocket (JWT auth) ──→  [/game]    │
│       │  Scores synchronisés · Timer serveur                    │
│       ↓                                                         │
│  [/room/:code/results]  ←── synchronisé ──→  [/results]       │
│       Rejouer · Quitter                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Étapes détaillées

#### Étape 0 — Authentification (obligatoire)

Avant tout accès au jeu, l'utilisateur doit être authentifié. Un guard Angular (`AuthGuard`) redirige automatiquement vers `/auth/login` si aucun token valide n'est présent.

#### Étape 1 — Accueil

L'utilisateur authentifié arrive sur `/`. Son pseudo est celui de son compte (pas de saisie). Deux actions : **Créer** ou **Rejoindre**.

#### Étape 2A — Création de partie (Hôte)

1. Requête authentifiée `POST /api/rooms` (header `Authorization: Bearer <token>`)
2. Le serveur extrait le `userId` depuis le JWT, génère le code de salon `TIGER7`
3. L'Hôte est redirigé sur `/room/TIGER7`
4. Il configure les options et partage le code

#### Étape 2B — Rejoindre (Guest)

1. Le Guest saisit le code et soumet `POST /api/rooms/:code/join`
2. Le serveur valide le JWT + le code + le statut du salon
3. Le Guest est redirigé sur `/room/TIGER7`

#### Étapes 3, 4, 5 — Salon, Partie, Résultats

Identiques à la description générale, avec la différence que toutes les connexions WebSocket sont **authentifiées via JWT** (voir section 9).

---

## 3. Authentification — Flux complet

### 3.1 Inscription (`/auth/register`)

```
Client                          Serveur NestJS                  PostgreSQL (Prisma)
  │                                   │                                │
  │  POST /api/auth/register           │                                │
  │  { email, pseudo, password }       │                                │
  │──────────────────────────────────►│                                │
  │                                   │  Vérifie unicité email/pseudo  │
  │                                   │─────────────────────────────►  │
  │                                   │  Hash password (bcrypt, 12)    │
  │                                   │  CREATE User                   │
  │                                   │─────────────────────────────►  │
  │                                   │◄─────────────────────────────  │
  │                                   │  Génère Access Token (15 min)  │
  │                                   │  Génère Refresh Token (7 j)    │
  │                                   │  Stocke hash Refresh en base   │
  │◄──────────────────────────────────│                                │
  │  { accessToken }                  │                                │
  │  Set-Cookie: refreshToken (httpOnly, secure, sameSite=strict)      │
```

### 3.2 Connexion (`/auth/login`)

```
Client                          Serveur NestJS                  PostgreSQL (Prisma)
  │                                   │                                │
  │  POST /api/auth/login              │                                │
  │  { email, password }               │                                │
  │──────────────────────────────────►│                                │
  │                                   │  Trouve User par email         │
  │                                   │─────────────────────────────►  │
  │                                   │◄─────────────────────────────  │
  │                                   │  Compare password (bcrypt)     │
  │                                   │  Génère Access Token (15 min)  │
  │                                   │  Génère Refresh Token (7 j)    │
  │                                   │  Met à jour refreshTokenHash   │
  │◄──────────────────────────────────│                                │
  │  { accessToken, user: {...} }      │                                │
  │  Set-Cookie: refreshToken (httpOnly)                               │
```

### 3.3 Refresh Token

```
Client                          Serveur NestJS
  │                                   │
  │  POST /api/auth/refresh            │
  │  Cookie: refreshToken             │
  │──────────────────────────────────►│
  │                                   │  Vérifie signature JWT du refresh
  │                                   │  Compare avec hash en base
  │                                   │  Génère nouvel Access Token
  │                                   │  Rotation : nouveau Refresh Token
  │◄──────────────────────────────────│
  │  { accessToken }                  │
  │  Set-Cookie: refreshToken (nouveau)│
```

### 3.4 Déconnexion

```
Client                          Serveur NestJS
  │                                   │
  │  POST /api/auth/logout             │
  │  Authorization: Bearer <token>     │
  │──────────────────────────────────►│
  │                                   │  Invalide refreshTokenHash en base
  │                                   │  Clear cookie
  │◄──────────────────────────────────│
  │  204 No Content                   │
  │  Set-Cookie: refreshToken=; Max-Age=0│
```

### 3.5 Stratégies JWT (Passport)

Deux stratégies NestJS Passport sont implémentées :

| Stratégie | Fichier | Usage |
|---|---|---|
| `JwtAccessStrategy` | `auth/strategies/jwt-access.strategy.ts` | Protège toutes les routes REST + WS |
| `JwtRefreshStrategy` | `auth/strategies/jwt-refresh.strategy.ts` | Protège uniquement `POST /auth/refresh` |

```typescript
// jwt-access.strategy.ts
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    process.env.JWT_ACCESS_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    return this.usersService.findById(payload.sub);
  }
}
```

### 3.6 Guards NestJS

| Guard | Décorateur | Usage |
|---|---|---|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | Protège tous les endpoints authentifiés |
| `RolesGuard` | `@UseGuards(RolesGuard)` | Futur usage rôles (V2) |

Application globale dans `main.ts` :

```typescript
app.useGlobalGuards(new JwtAuthGuard());
```

Les routes publiques sont marquées avec un décorateur custom `@Public()`.

### 3.7 Authentification WebSocket

Le JWT est transmis au moment du handshake Socket.IO :

```typescript
// Côté client Angular
const socket = io('/game', {
  auth: { token: this.authService.getAccessToken() }
});
```

Côté Gateway NestJS, un `WsJwtGuard` extrait et valide le token depuis `client.handshake.auth.token` :

```typescript
// game.gateway.ts
@UseGuards(WsJwtGuard)
@WebSocketGateway({ namespace: '/game' })
export class GameGateway { ... }
```

```typescript
// ws-jwt.guard.ts
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client  = context.switchToWs().getClient<Socket>();
    const token   = client.handshake.auth?.token;
    // Vérifie et décode le JWT — attache user à client.data.user
    ...
  }
}
```

---

## 4. Acteurs et rôles

| Acteur | Rôle | Permissions |
|---|---|---|
| **Utilisateur non authentifié** | Visiteur | Accès uniquement à `/auth/login` et `/auth/register` |
| **Hôte** | Crée la partie | Modifier les options, lancer la partie, proposer revanche |
| **Guest** | Rejoint via code | Voir les options (lecture seule), se marquer prêt, accepter revanche |
| **Serveur NestJS** | Arbitre central | Valide JWT, calcule scores, gère timer, synchronise états |

---

## 5. Architecture technique

### Stack retenue

| Couche | Technologie | Version |
|---|---|---|
| **Frontend** | Angular (Standalone Components) | 17+ |
| **Styling** | TailwindCSS | 3.x |
| **WebSocket client** | Socket.IO Client | 4.x |
| **State management** | Angular Signals | natif 17+ |
| **Backend** | NestJS | 10+ |
| **ORM** | **Prisma** | 5.x |
| **Base de données** | **PostgreSQL** | 15+ |
| **Cache / État temps réel** | Redis (`ioredis`) | 7.x |
| **WebSocket serveur** | Socket.IO via `@nestjs/platform-socket.io` | 4.x |
| **Authentification** | Passport.js + `@nestjs/jwt` + `bcrypt` | — |
| **Tokens** | **JWT** (Access 15 min + Refresh 7 j) | — |
| **Validation** | `class-validator` + `class-transformer` | — |
| **Tests** | Jest (back) + Karma (front) | — |

### Schéma d'architecture globale

```
┌────────────────────────┐      ┌──────────────────────────────────────────────┐
│     Angular App         │      │                NestJS Server                  │
│                        │      │                                                │
│  ┌──────────────────┐  │ HTTP │  ┌────────────┐   ┌──────────────────────┐   │
│  │  AuthComponent   │◄─┼─────►│  │AuthController│  │    AuthService        │   │
│  │  HomeComponent   │  │      │  ├────────────┤   ├──────────────────────┤   │
│  │  RoomComponent   │  │      │  │RoomsController│  │    RoomsService       │   │
│  │  GameComponent   │  │      │  ├────────────┤   ├──────────────────────┤   │
│  │  ResultComponent │  │      │  │UsersController│  │    UsersService       │   │
│  └──────────────────┘  │      │  └─────┬──────┘   └──────────┬───────────┘   │
│                        │      │        │                       │               │
│  ┌──────────────────┐  │  WS  │  ┌─────▼──────┐   ┌──────────▼───────────┐   │
│  │  SocketService   │◄─┼─────►│  │ GameGateway │   │    GameService        │   │
│  │  AuthService     │  │      │  │ (Socket.IO) │   │    ScoreService       │   │
│  │  GameStateService│  │      │  │ WsJwtGuard  │   │    TimerService       │   │
│  └──────────────────┘  │      │  └─────────────┘   │    QuizService        │   │
│                        │      │                     └──────────┬───────────┘   │
└────────────────────────┘      │                                │               │
                                │              ┌─────────────────┴────────┐      │
                                │              │         Prisma Client     │      │
                                │              │    (UserModel, RoomModel) │      │
                                │              └──────────────┬────────────┘      │
                                │                             │                   │
                                │              ┌──────────────▼────────────┐      │
                                │              │        PostgreSQL           │      │
                                │              │  users · rooms · game_logs │      │
                                │              └───────────────────────────┘      │
                                │                                                  │
                                │              ┌───────────────────────────┐      │
                                │              │    Redis (ioredis)          │      │
                                │              │  État salons · Scores live  │      │
                                │              └───────────────────────────┘      │
                                └──────────────────────────────────────────────────┘
```

---

## 6. Backend NestJS — Architecture Service/Controller

### Structure des modules

```
server/src/
├── main.ts
├── app.module.ts
│
├── auth/                              # ── MODULE AUTH ──
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts          # Guard HTTP
│   │   └── ws-jwt.guard.ts            # Guard WebSocket
│   ├── strategies/
│   │   ├── jwt-access.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── decorators/
│   │   ├── public.decorator.ts        # @Public() — bypass JwtAuthGuard
│   │   └── current-user.decorator.ts  # @CurrentUser() — injecte user depuis req
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── auth-response.dto.ts
│
├── users/                             # ── MODULE USERS ──
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       └── user-profile.dto.ts
│
├── rooms/                             # ── MODULE ROOMS ──
│   ├── rooms.module.ts
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   └── dto/
│       ├── create-room.dto.ts
│       ├── join-room.dto.ts
│       └── update-options.dto.ts
│
├── game/                              # ── MODULE GAME ──
│   ├── game.module.ts
│   ├── game.gateway.ts
│   ├── game.service.ts
│   ├── score.service.ts
│   ├── timer.service.ts
│   ├── quiz.service.ts
│   └── dto/
│       ├── answer.dto.ts
│       └── game-options.dto.ts
│
├── questions/                         # ── MODULE QUESTIONS ──
│   ├── questions.module.ts
│   ├── questions.service.ts
│   └── data/
│       ├── bank-easy.ts
│       ├── bank-normal.ts
│       └── bank-expert.ts
│
├── prisma/                            # ── MODULE PRISMA ──
│   ├── prisma.module.ts
│   └── prisma.service.ts              # Extend PrismaClient + onModuleInit
│
└── redis/                             # ── MODULE REDIS ──
    ├── redis.module.ts
    └── redis.service.ts
```

---

### 6.1 Module Auth

#### AuthController

**Préfixe :** `/api/auth`

| Méthode | Route | Guard | Description |
|---|---|---|---|
| `POST` | `/register` | `@Public()` | Inscription — retourne `accessToken` + set cookie refresh |
| `POST` | `/login` | `@Public()` | Connexion — retourne `accessToken` + set cookie refresh |
| `POST` | `/refresh` | `JwtRefreshGuard` | Renouvelle l'access token via refresh cookie |
| `POST` | `/logout` | `JwtAuthGuard` | Invalide le refresh token en base |
| `GET` | `/me` | `JwtAuthGuard` | Retourne le profil de l'utilisateur courant |

#### AuthService

| Méthode | Description |
|---|---|
| `register(dto)` | Hash password + `prisma.user.create()` + génère tokens |
| `login(dto)` | Vérifie credentials + génère tokens |
| `logout(userId)` | `prisma.user.update({ refreshTokenHash: null })` |
| `refreshTokens(userId, refreshToken)` | Vérifie token + rotation + retourne nouveaux tokens |
| `generateTokens(userId, email)` | Génère `accessToken` (15 min) + `refreshToken` (7 j) |
| `hashData(data)` | `bcrypt.hash(data, 12)` |
| `setRefreshTokenCookie(res, token)` | Pose le cookie `httpOnly, secure, sameSite=strict` |

#### DTOs Auth

```typescript
// register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  pseudo: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/)  // Au moins 1 maj + 1 chiffre
  password: string;
}

// login.dto.ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

---

### 6.2 Module Users

#### UsersController

**Préfixe :** `/api/users`

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/me` | Profil complet de l'utilisateur connecté |
| `PATCH` | `/me` | Modifier pseudo ou avatar |
| `GET` | `/:id` | Profil public d'un utilisateur |

#### UsersService

| Méthode | Description |
|---|---|
| `findById(id)` | `prisma.user.findUnique({ where: { id } })` |
| `findByEmail(email)` | Pour la stratégie Passport login |
| `updateProfile(id, dto)` | `prisma.user.update()` |
| `setRefreshTokenHash(id, hash)` | Persist le hash du refresh token |

---

### 6.3 Module Rooms

#### RoomsController

**Préfixe :** `/api/rooms`  
Toutes les routes protégées par `JwtAuthGuard` (global).

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| `POST` | `/` | Créer un salon | `{ roomId, code }` |
| `GET` | `/:code` | Vérifier l'existence | `{ exists, status }` |
| `POST` | `/:code/join` | Rejoindre un salon | `{ roomId, playerId }` |
| `GET` | `/:code/state` | État complet du salon | `RoomStateDto` |
| `PATCH` | `/:code/options` | Modifier les options (Hôte) | `{ success }` |
| `POST` | `/:code/start` | Lancer la partie (Hôte) | `{ success }` |

Le `userId` est extrait du JWT via `@CurrentUser()` — il n'est **jamais** passé dans le body.

```typescript
@Post()
async createRoom(@CurrentUser() user: User): Promise<CreateRoomResponse> {
  return this.roomsService.createRoom(user.id, user.pseudo);
}
```

#### RoomsService

| Méthode | Description |
|---|---|
| `createRoom(userId, pseudo)` | Génère code + crée état dans Redis |
| `joinRoom(code, userId, pseudo)` | Valide code + ajoute guest dans Redis |
| `getRoom(code)` | Lit l'état depuis Redis |
| `updateOptions(code, userId, options)` | Vérifie que userId === hostId, met à jour Redis |
| `setPlayerReady(code, userId)` | Marque le joueur prêt dans Redis |
| `generateCode()` | Génère un code unique 6 car. (vérifie unicité dans Redis) |

---

### 6.4 Module Game

#### GameGateway

```typescript
@WebSocketGateway({ namespace: '/game', cors: { origin: process.env.FRONTEND_URL } })
@UseGuards(WsJwtGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(
    private readonly gameService:  GameService,
    private readonly scoreService: ScoreService,
    private readonly timerService: TimerService,
  ) {}

  handleConnection(client: Socket): void {
    // WsJwtGuard a déjà attaché client.data.user
    const user = client.data.user;
    ...
  }
}
```

**Événements entrants :**

| Événement | DTO de validation | Handler |
|---|---|---|
| `joinRoom` | `JoinRoomWsDto` | `handleJoinRoom` |
| `setReady` | `SetReadyDto` | `handleSetReady` |
| `updateOptions` | `GameOptionsDto` | `handleUpdateOptions` |
| `startGame` | `StartGameDto` | `handleStartGame` |
| `answer` | `AnswerDto` | `handleAnswer` |
| `requestRematch` | `RematchDto` | `handleRematch` |
| `leaveRoom` | `LeaveRoomDto` | `handleLeaveRoom` |

```typescript
// answer.dto.ts
export class AnswerDto {
  @IsString()
  roomCode: string;

  @IsInt() @Min(0) @Max(19)
  questionIndex: number;

  @IsInt() @Min(0) @Max(3)
  choiceIndex: number;

  @IsNumber()
  timestamp: number;       // Date.now() côté client — pour calcul bonus rapidité
}
```

#### GameService

| Méthode | Description |
|---|---|
| `initGame(roomCode)` | Génère questions via QuizService, initialise scores dans Redis |
| `processAnswer(roomCode, userId, dto)` | Valide + délègue à ScoreService + diffuse `scoreUpdate` |
| `advanceQuestion(roomCode, userId)` | Mode Battle — question suivante pour un joueur |
| `advanceSharedQuestion(roomCode)` | Mode Quiz — question commune suivante |
| `checkGameOver(roomCode)` | Vérifie si la partie est terminée |
| `endGame(roomCode)` | Calcule résultats + émet `gameOver` + persiste en base via Prisma |
| `handleDisconnect(roomCode, userId)` | Lance timer reconnexion 30 s |
| `handleReconnect(roomCode, userId)` | Renvoie état complet au client reconnecté |

#### ScoreService

| Méthode | Description |
|---|---|
| `computeScore(params)` | Calcul complet : base + rapidité + warrior + pénalité |
| `getBasePoints(mode, level)` | +1 / +2 / +3 selon niveau |
| `getSpeedBonus(responseTime, tolerance)` | ±200 ms de tolérance réseau |
| `getWarriorBonus(streak)` | +15 / +30 / +100 |
| `applyPenalty(currentScore)` | −1 plancher 0 |
| `updateStreak(correct, current)` | Incrémente ou remet à 0 |

```typescript
interface ScoreParams {
  correct:        boolean;
  mode:           'battle' | 'quiz';
  level:          'easy' | 'normal' | 'expert';
  responseTime:   number;     // ms
  streak:         number;
  currentScore:   number;
  speedEnabled:   boolean;
  warriorEnabled: boolean;
}

interface ScoreResult {
  newScore:   number;
  delta:      number;
  newStreak:  number;
  bonuses:    BonusType[];
}

type BonusType = 'speed_10' | 'speed_5' | 'warrior_15' | 'warrior_30' | 'warrior_100' | 'penalty';
```

#### TimerService

| Méthode | Description |
|---|---|
| `startTimer(roomCode, seconds, gateway)` | Lance setInterval, émet `timerTick` chaque seconde |
| `stopTimer(roomCode)` | clearInterval |
| `pauseTimer(roomCode)` | Sauvegarde `timeLeft` + stopTimer |
| `resumeTimer(roomCode, gateway)` | Reprend avec le `timeLeft` sauvegardé |
| `getTimeLeft(roomCode)` | Lecture depuis Redis |

---

### 6.5 Module Questions

#### QuestionsService

| Méthode | Description |
|---|---|
| `getBank(level)` | Retourne `BANK_EASY` / `BANK_NORMAL` / `BANK_EXPERT` |
| `getQuestionsForBattle(count)` | Shuffle + slice 2×20 questions distinctes de `BANK_NORMAL` |
| `getQuestionsForQuiz(level, count)` | Shuffle + slice 20 questions de la banque du niveau |
| `stripAnswers(questions)` | Retire le champ `a` avant envoi au client |
| `shuffle(arr)` | Fisher-Yates |

---

### 6.6 Module Redis

#### PrismaService

```typescript
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

#### RedisService

```typescript
@Injectable()
export class RedisService {
  private client: Redis;

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  async get<T>(key: string): Promise<T | null>
  async delete(key: string): Promise<void>
  async exists(key: string): Promise<boolean>
  async expire(key: string, seconds: number): Promise<void>
}
```

**Convention de clés Redis :**

| Clé | Contenu | TTL |
|---|---|---|
| `room:{code}` | État complet du salon | 1800 s |
| `room:{code}:timer` | Secondes restantes | Dynamique |
| `room:{code}:scores` | Scores en temps réel | 1800 s |

---

## 7. Schéma Prisma — Base de données

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── UTILISATEURS ──────────────────────────────────────
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  pseudo            String    @unique
  passwordHash      String
  refreshTokenHash  String?
  avatarUrl         String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  hostedRooms       Room[]    @relation("HostRooms")
  gameLogs          GameLog[] @relation("PlayerGameLogs")

  @@map("users")
}

// ── SALONS (métadonnées persistées) ───────────────────
model Room {
  id          String      @id @default(cuid())
  code        String      @unique
  status      RoomStatus  @default(WAITING)
  hostId      String
  guestId     String?
  options     Json                         // GameOptions sérialisées
  createdAt   DateTime    @default(now())
  closedAt    DateTime?

  // Relations
  host        User        @relation("HostRooms", fields: [hostId], references: [id])
  gameLogs    GameLog[]

  @@map("rooms")
}

enum RoomStatus {
  WAITING
  READY
  COUNTDOWN
  PLAYING
  FINISHED
  CLOSED
}

// ── HISTORIQUE DES PARTIES ────────────────────────────
model GameLog {
  id           String    @id @default(cuid())
  roomId       String
  playerId     String
  pseudo       String                       // Snapshot au moment de la partie
  score        Int
  correctCount Int
  totalCount   Int       @default(20)
  mode         GameMode
  level        GameLevel @default(NORMAL)
  isWinner     Boolean
  playedAt     DateTime  @default(now())

  // Relations
  room         Room      @relation(fields: [roomId], references: [id])
  player       User      @relation("PlayerGameLogs", fields: [playerId], references: [id])

  @@map("game_logs")
}

enum GameMode {
  BATTLE
  QUIZ
}

enum GameLevel {
  EASY
  NORMAL
  EXPERT
}
```

### Migrations Prisma

```bash
# Créer et appliquer une migration
npx prisma migrate dev --name init

# Générer le client Prisma
npx prisma generate

# Inspecter la base
npx prisma studio
```

---

## 8. Frontend Angular — Architecture

### Structure du projet

```
client/src/app/
│
├── core/
│   ├── services/
│   │   ├── auth.service.ts             # Login/register/logout/refresh
│   │   ├── token.service.ts            # Gestion Access Token (memory only)
│   │   ├── socket.service.ts           # Socket.IO + observables typés
│   │   ├── game-state.service.ts       # Signals : scores, timer, options
│   │   └── audio.service.ts            # Web Audio API
│   ├── interceptors/
│   │   └── jwt.interceptor.ts          # Ajoute Bearer token + gère le 401
│   └── guards/
│       ├── auth.guard.ts               # Redirige vers /auth/login si non connecté
│       └── room.guard.ts               # Vérifie que le salon existe
│
├── features/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   └── login.component.html
│   │   └── register/
│   │       ├── register.component.ts
│   │       └── register.component.html
│   │
│   ├── home/
│   │   └── home.component.ts           # Boutons Créer / Rejoindre
│   │
│   ├── room/
│   │   ├── room.component.ts           # Salon d'attente
│   │   └── components/
│   │       ├── player-card.component.ts
│   │       ├── option-panel.component.ts
│   │       └── room-code.component.ts
│   │
│   ├── game/
│   │   ├── game.component.ts
│   │   └── components/
│   │       ├── battle-bar.component.ts
│   │       ├── player-board.component.ts
│   │       ├── bonus-popup.component.ts
│   │       └── streak-badge.component.ts
│   │
│   └── results/
│       └── results.component.ts
│
├── shared/
│   ├── components/
│   │   ├── option-toggle.component.ts
│   │   └── countdown-overlay.component.ts
│   └── models/
│       ├── user.model.ts
│       ├── room.model.ts
│       ├── game.model.ts
│       └── score.model.ts
│
└── app.routes.ts
```

### Routes Angular

```typescript
export const routes: Routes = [
  // Routes publiques
  { path: 'auth/login',    loadComponent: () => import('./features/auth/login/login.component'),       canActivate: [noAuthGuard] },
  { path: 'auth/register', loadComponent: () => import('./features/auth/register/register.component'), canActivate: [noAuthGuard] },

  // Routes protégées
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '',                  loadComponent: () => import('./features/home/home.component') },
      { path: 'room/:code',        loadComponent: () => import('./features/room/room.component'),    canActivate: [RoomGuard] },
      { path: 'room/:code/game',   loadComponent: () => import('./features/game/game.component'),    canActivate: [RoomGuard] },
      { path: 'room/:code/results',loadComponent: () => import('./features/results/results.component') },
    ]
  },
  { path: '**', redirectTo: '' }
];
```

### JWT Interceptor Angular

```typescript
// jwt.interceptor.ts
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(
    private tokenService: TokenService,
    private authService:  AuthService,
    private router:       Router,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.tokenService.getAccessToken();

    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Tente un refresh silencieux
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = this.tokenService.getAccessToken();
              return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
            }),
            catchError(() => {
              this.router.navigate(['/auth/login']);
              return throwError(() => err);
            })
          );
        }
        return throwError(() => err);
      })
    );
  }
}
```

### AuthService Angular

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated     = computed(() => !!this.currentUser());
  readonly user                = this.currentUser.asReadonly();

  login(dto: LoginDto): Observable<void>
  register(dto: RegisterDto): Observable<void>
  logout(): Observable<void>
  refreshToken(): Observable<void>       // Appelé automatiquement par l'interceptor
  loadCurrentUser(): Observable<void>    // Appelé au démarrage de l'app (APP_INITIALIZER)
}
```

---

## 9. Communication temps réel — Socket.IO + NestJS Gateway

### Connexion authentifiée

```typescript
// socket.service.ts
connect(roomCode: string): void {
  this.socket = io(`${environment.wsUrl}/game`, {
    auth: { token: this.tokenService.getAccessToken() },
    query: { roomCode }
  });
}
```

### Événements Client → Serveur

| Événement | DTO | Description |
|---|---|---|
| `joinRoom` | `{ roomCode }` | Rejoint le channel Socket.IO du salon |
| `setReady` | `{ roomCode }` | Se marque prêt |
| `updateOptions` | `{ roomCode, options }` | Hôte modifie les options |
| `startGame` | `{ roomCode }` | Hôte lance la partie |
| `answer` | `{ roomCode, questionIndex, choiceIndex, timestamp }` | Soumet une réponse |
| `requestRematch` | `{ roomCode }` | Demande de revanche |
| `leaveRoom` | `{ roomCode }` | Quitte le salon |

### Événements Serveur → Clients

| Événement | Diffusion | Payload |
|---|---|---|
| `roomState` | Émetteur | État complet du salon |
| `playerJoined` | Room | `{ userId, pseudo, role }` |
| `playerLeft` | Room | `{ userId }` |
| `playerReady` | Room | `{ userId, ready }` |
| `optionsUpdated` | Room | `GameOptions` |
| `countdownStart` | Room | `{ seconds: 3 }` |
| `gameStart` | Room | Questions (sans réponses) + options + `startTime` |
| `scoreUpdate` | Room | `{ userId, score, delta, bonuses[], streak, correct }` |
| `questionChange` | Room | `{ index }` — mode Quiz |
| `timerTick` | Room | `{ timeLeft }` |
| `gameOver` | Room | `{ winner, scores, stats }` |
| `playerDisconnected` | Room | `{ userId, deadline }` |
| `playerReconnected` | Room | `{ userId }` |
| `forfeit` | Room | `{ winner: userId }` |

### Sécurité WebSocket

- Le `WsJwtGuard` vérifie le token à chaque connexion **et** à chaque message `@SubscribeMessage`
- Le `userId` utilisé pour valider les actions provient **exclusivement** de `client.data.user.id` (décodé du JWT) — jamais du payload client
- Toute tentative d'usurpation d'identité dans le payload est ignorée

---

## 10. Modes de jeu et options

### Mode Battle

- `QuizService.getQuestionsForBattle()` — Fisher-Yates sur `BANK_NORMAL`, 2×20 questions distinctes
- Progression indépendante par joueur
- Fin quand les deux ont terminé leurs 20 questions

### Mode Quiz

- `QuizService.getQuestionsForQuiz(level)` — 20 questions communes
- `currentQuestionIndex` maintenu par `GameService` dans Redis
- Premier à répondre → `advanceSharedQuestion()` → événement `questionChange`

### Toutes les options

| Option | Configurée par | Persistée dans |
|---|---|---|
| Mode jeu | Hôte | Redis `room:{code}` + PostgreSQL `Room.options` |
| Chrono | Hôte | Redis + `TimerService` |
| Rapidité | Hôte | Redis |
| Warrior | Hôte | Redis |
| Niveau (Quiz) | Hôte | Redis |

---

## 11. Système de scoring

### Points de base

| Mode | Bonne réponse | Mauvaise réponse |
|---|---|---|
| Battle | +1 | 0 |
| Quiz Facile | +1 | −1 (plancher 0) |
| Quiz Normal | +2 | −1 (plancher 0) |
| Quiz Expert | +3 | −1 (plancher 0) |

### Bonus cumulables (calculés par `ScoreService`)

| Condition | Bonus |
|---|---|
| Réponse 0–2 s | +10 |
| Réponse 3–5 s | +5 |
| 3 bonnes consécutives | +15 |
| 6 bonnes consécutives | +30 |
| 10 bonnes consécutives | +100 |

**Score max théorique :** `+3 + 10 + 100 = +113` sur une seule question.

---

## 12. Banques de questions

Stockées **côté serveur uniquement** dans `questions/data/`.

| Fichier | Questions | Usage |
|---|---|---|
| `bank-easy.ts` | 25 | Quiz Facile |
| `bank-normal.ts` | 59 | Battle + Quiz Normal |
| `bank-expert.ts` | 25 | Quiz Expert |

Structure d'une question (interface TypeScript côté serveur) :

```typescript
interface Question {
  q:    string;     // Intitulé
  opts: string[];   // 4 propositions
  a:    number;     // Index correct (0–3) — JAMAIS envoyé au client
}
```

---

## 13. Sécurité et contraintes

### Authentification

- Mot de passe hashé avec `bcrypt` (rounds = 12)
- Access Token : JWT signé `HS256`, expiration **15 min**, payload `{ sub: userId, email }`
- Refresh Token : JWT signé avec une **clé secrète distincte**, expiration **7 jours**, stocké en cookie `httpOnly + secure + sameSite=strict`
- Seul le **hash** du Refresh Token est stocké en base (colonne `refreshTokenHash`)
- Rotation systématique du Refresh Token à chaque renouvellement
- Logout invalide le hash en base (révocation effective)

### Autorité serveur

- Les bonnes réponses ne transitent **jamais** vers le client
- Scores calculés et stockés côté serveur uniquement
- Timer géré par le serveur (`TimerService`)
- `userId` extrait du JWT uniquement — jamais depuis le body/payload client
- Vérification `playerId === hostId` avant toute action d'hôte

### Validation

- Tous les DTOs validés par `class-validator` + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
- Événements WebSocket également pipés avec `ValidationPipe`

### Rate limiting

```typescript
// main.ts
import rateLimit from 'express-rate-limit';
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, max: 10 }));   // 10 req/15 min
app.use('/api',      rateLimit({ windowMs: 60_000,      max: 60 }));   // 60 req/min
```

### CORS

```typescript
app.enableCors({
  origin:      process.env.FRONTEND_URL,
  credentials: true,                        // Nécessaire pour les cookies Refresh
  methods:     ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

### Contraintes fonctionnelles

- 2 joueurs max par salon (rejet `ROOM_FULL` si 3e tentative)
- Salon en statut `PLAYING` non rejoignable
- Seul l'Hôte peut modifier les options et lancer la partie
- Reconnexion possible dans les **30 secondes** après déconnexion
- Salon expiré après **30 min** d'inactivité (TTL Redis)

---

## 14. Évolutions futures (V2)

Les fonctionnalités suivantes sont **hors périmètre V1** mais l'architecture Prisma + NestJS les anticipe nativement.

| Fonctionnalité | Ce qui est déjà en place | À ajouter en V2 |
|---|---|---|
| **Historique des parties** | Modèle `GameLog` déjà dans le schéma Prisma | Interface `/history` Angular |
| **Classement global** | `GameLog.score` persisté | `LeaderboardService` + route `/api/leaderboard` |
| **Profils enrichis** | `User.avatarUrl` dans le schéma | Upload avatar (S3/Cloudinary) |
| **Matchmaking** | — | File d'attente Redis + `MatchmakingGateway` |
| **Questions custom** | — | CRUD `QuestionModule` + table `Question` Prisma |
| **Catégories** | — | Champ `category` sur `Question`, filtre dans `QuizService` |
| **Rôles admin** | `RolesGuard` déjà déclaré | Enum `Role` sur `User`, routes admin |
| **Chat** | — | Événement `chatMessage` dans `GameGateway` |
| **PWA** | — | `ngsw-config.json` Angular Service Worker |
| **Spectateurs** | — | Rôle `spectator` dans `PlayerSlot`, abonnement lecture seule |
