export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Quiz Battle API',
    version: '1.0.0',
    description:
      'API V1 pour Quiz Battle (auth, rooms, game, questions). Inspirée du cahier des charges avril 2026.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
  paths: {
    '/auth/register': { post: { summary: 'Inscription', tags: ['Auth'] } },
    '/auth/login': { post: { summary: 'Connexion', tags: ['Auth'] } },
    '/auth/refresh': { post: { summary: 'Refresh access token', tags: ['Auth'] } },
    '/auth/logout': { post: { summary: 'Déconnexion', tags: ['Auth'] } },
    '/users/me': {
      get: {
        summary: 'Profil courant',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
      },
    },
    '/rooms': {
      post: {
        summary: 'Créer un salon',
        tags: ['Rooms'],
        security: [{ bearerAuth: [] }],
      },
    },
    '/rooms/{code}/join': {
      post: {
        summary: 'Rejoindre un salon',
        tags: ['Rooms'],
        security: [{ bearerAuth: [] }],
      },
    },
    '/rooms/{code}': { get: { summary: 'Détails salon', tags: ['Rooms'] } },
    '/rooms/{code}/options': {
      patch: {
        summary: 'Mettre à jour options',
        tags: ['Rooms'],
      },
    },
    '/questions': { get: { summary: 'Lister questions', tags: ['Questions'] } },
    '/game/{code}/start': { post: { summary: 'Démarrer partie', tags: ['Game'] } },
    '/game/{code}/answer': { post: { summary: 'Soumettre réponse', tags: ['Game'] } },
    '/game/{code}/state': { get: { summary: 'État partie', tags: ['Game'] } },
  },
};
