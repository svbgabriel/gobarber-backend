import request from 'supertest';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('Provider Integration', () => {
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

  it('should be able to list providers', async () => {
    // Create a provider
    await request(app).post('/users').send({
      name: 'Provider User',
      email: 'provider@example.com',
      password: 'password123',
      provider: true,
    });

    // Create a regular user
    const userPayload = {
      name: 'Regular User',
      email: 'user@example.com',
      password: 'password123',
    };
    await request(app).post('/users').send(userPayload);

    // Login to get token
    const sessionResponse = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });

    const { token } = sessionResponse.body;

    // List providers
    const response = await request(app)
      .get('/providers')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0]).toHaveProperty('name', 'Provider User');
  });
});
