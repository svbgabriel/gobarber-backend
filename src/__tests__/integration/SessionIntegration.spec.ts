import request from 'supertest';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('Session Integration', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    await startContainers();
    const appModule = await import('../../app');
    app = appModule.default;
  }, 180000);

  afterAll(async () => {
    await stopContainers();
  });

  it('should be able to authenticate', async () => {
    const userPayload = {
      name: 'Diego Fernandes',
      email: 'diego@rocketseat.com.br',
      password: 'password123',
    };

    // Create user
    await request(app).post('/users').send(userPayload);

    // Login
    const response = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(userPayload.email);
  });
});
