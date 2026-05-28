import request from 'supertest';
import { startContainers, stopContainers } from '../helpers/database-container';
import { App } from 'supertest/types';

describe('User Integration', () => {
  let app: App;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    await startContainers();

    // Import app dynamically after environment variables are set
    const appModule = await import('../../app');
    app = appModule.default;
  }, 180000); // Increased timeout for 3 containers

  afterAll(async () => {
    await stopContainers();
  });

  it('should be able to register a new user via API', async () => {
    const response = await request(app).post('/users').send({
      name: 'Name Test',
      email: 'name@test.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Name Test');
  });
});
