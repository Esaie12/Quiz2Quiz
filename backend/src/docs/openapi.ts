export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Quiz Battle API',
    version: '1.1.0',
    description:
      'API V1 Quiz Battle (Auth, Users, Rooms, Questions, Game). Toutes les routes incluent des exemples pour test manuel.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Rooms' },
    { name: 'Questions' },
    { name: 'Game' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    schemas: {
      RegisterBody: {
        type: 'object',
        required: ['email', 'pseudo', 'password'],
        properties: {
          email: { type: 'string', example: 'amina@mail.com' },
          pseudo: { type: 'string', example: 'Amina' },
          password: { type: 'string', example: 'Secret123!' },
        },
      },
      LoginBody: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'amina@mail.com' },
          password: { type: 'string', example: 'Secret123!' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'a7f0fa7a-3d6b-4f6f-8bcb-6e3d8893d4c2' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'a7f0fa7a-3d6b-4f6f-8bcb-6e3d8893d4c2' },
              email: { type: 'string', example: 'amina@mail.com' },
              pseudo: { type: 'string', example: 'Amina' },
            },
          },
        },
      },
      Room: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'TIGER7' },
          hostUserId: { type: 'string', example: 'a7f0fa7a-3d6b-4f6f-8bcb-6e3d8893d4c2' },
          guestUserId: { type: 'string', nullable: true, example: '951fbe3f-5ca0-4f87-ae44-4549980e20ad' },
          status: { type: 'string', enum: ['waiting', 'playing', 'finished'], example: 'waiting' },
          options: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['battle', 'quiz'], example: 'battle' },
              difficulty: { type: 'string', enum: ['easy', 'normal', 'expert'], example: 'normal' },
              durationInMinutes: { type: 'integer', example: 3 },
              warriorMode: { type: 'boolean', example: false },
            },
          },
          createdAt: { type: 'string', example: '2026-04-09T23:00:00.000Z' },
        },
      },
      QuestionPublic: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'q2' },
          category: { type: 'string', example: 'Technologie' },
          difficulty: { type: 'string', example: 'normal' },
          prompt: { type: 'string', example: 'Quel protocole est utilisé pour les API REST sécurisées ?' },
          choices: { type: 'array', items: { type: 'string' }, example: ['HTTP(S)', 'FTP', 'SMTP', 'SSH'] },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Inscription',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterBody' },
            },
          },
        },
        responses: {
          201: {
            description: 'Compte créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  accessToken: 'a7f0fa7a-3d6b-4f6f-8bcb-6e3d8893d4c2',
                  user: { id: 'a7f0fa7a-3d6b-4f6f-8bcb-6e3d8893d4c2', email: 'amina@mail.com', pseudo: 'Amina' },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connexion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginBody' },
              example: { email: 'amina@mail.com', password: 'Secret123!' },
            },
          },
        },
        responses: {
          201: {
            description: 'Connecté',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        parameters: [
          {
            in: 'header',
            name: 'x-refresh-token',
            required: true,
            schema: { type: 'string' },
            example: '70f5434d-d4a8-45a8-a5b4-f68922d96a11',
          },
        ],
        responses: {
          201: {
            description: 'Token renouvelé',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Déconnexion',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Déconnecté' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Profil courant',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profil',
            content: {
              'application/json': {
                example: { id: 'a7f0fa7a-3d6b-4f6f-8bcb-6e3d8893d4c2', email: 'amina@mail.com', pseudo: 'Amina' },
              },
            },
          },
        },
      },
    },
    '/rooms': {
      post: {
        tags: ['Rooms'],
        summary: 'Créer un salon',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Salon créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Room' },
              },
            },
          },
        },
      },
    },
    '/rooms/{code}/join': {
      post: {
        tags: ['Rooms'],
        summary: 'Rejoindre un salon',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'code', required: true, schema: { type: 'string' }, example: 'TIGER7' },
        ],
        responses: {
          201: {
            description: 'Salon rejoint',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
          },
        },
      },
    },
    '/rooms/{code}': {
      get: {
        tags: ['Rooms'],
        summary: 'Détails salon',
        parameters: [
          { in: 'path', name: 'code', required: true, schema: { type: 'string' }, example: 'TIGER7' },
        ],
        responses: {
          200: {
            description: 'Détails salon',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
          },
        },
      },
    },
    '/rooms/{code}/options': {
      patch: {
        tags: ['Rooms'],
        summary: 'Mettre à jour options',
        parameters: [
          { in: 'path', name: 'code', required: true, schema: { type: 'string' }, example: 'TIGER7' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { mode: 'quiz', difficulty: 'expert', durationInMinutes: 5, warriorMode: true },
            },
          },
        },
        responses: {
          200: {
            description: 'Options mises à jour',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
          },
        },
      },
    },
    '/questions': {
      get: {
        tags: ['Questions'],
        summary: 'Lister questions',
        parameters: [
          {
            in: 'query',
            name: 'difficulty',
            required: false,
            schema: { type: 'string', enum: ['easy', 'normal', 'expert'] },
            example: 'normal',
          },
        ],
        responses: {
          200: {
            description: 'Liste de questions publiques',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/QuestionPublic' } },
              },
            },
          },
        },
      },
    },
    '/game/{code}/start': {
      post: {
        tags: ['Game'],
        summary: 'Démarrer partie',
        parameters: [
          { in: 'path', name: 'code', required: true, schema: { type: 'string' }, example: 'TIGER7' },
        ],
        responses: {
          201: {
            description: 'Partie démarrée',
            content: {
              'application/json': {
                example: {
                  roomCode: 'TIGER7',
                  options: { mode: 'quiz', difficulty: 'normal', durationInMinutes: 3, warriorMode: false },
                  questions: [{ id: 'q2', category: 'Technologie', difficulty: 'normal', prompt: '...', choices: ['A', 'B'] }],
                  startedAt: '2026-04-09T23:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    '/game/{code}/answer': {
      post: {
        tags: ['Game'],
        summary: 'Soumettre réponse',
        parameters: [
          { in: 'path', name: 'code', required: true, schema: { type: 'string' }, example: 'TIGER7' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { player: 'host', questionId: 'q2', answer: 'HTTP(S)', responseMs: 1800 },
            },
          },
        },
        responses: {
          201: {
            description: 'Résultat de la réponse',
            content: {
              'application/json': {
                example: {
                  roomCode: 'TIGER7',
                  scores: { host: 12, guest: 0 },
                  pointsAwarded: 12,
                  correct: true,
                },
              },
            },
          },
        },
      },
    },
    '/game/{code}/state': {
      get: {
        tags: ['Game'],
        summary: 'État partie',
        parameters: [
          { in: 'path', name: 'code', required: true, schema: { type: 'string' }, example: 'TIGER7' },
        ],
        responses: {
          200: {
            description: 'Etat courant',
            content: {
              'application/json': {
                example: {
                  room: { code: 'TIGER7', status: 'playing' },
                  scores: { host: 12, guest: 5 },
                },
              },
            },
          },
        },
      },
    },
  },
};
