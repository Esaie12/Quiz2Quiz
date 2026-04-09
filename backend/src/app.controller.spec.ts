import { AppController } from './app.controller';

describe('AppController', () => {
  it('should return health payload', () => {
    const controller = new AppController();
    expect(controller.health().status).toBe('ok');
  });
});
