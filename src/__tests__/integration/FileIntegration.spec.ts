import request from 'supertest';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('File Integration', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_URL = 'http://localhost:3333';
    await startContainers();
    const appModule = await import('../../app');
    app = appModule.default;
  }, 180000);

  afterAll(async () => {
    await stopContainers();
  });

  it('should be able to upload a file', async () => {
    // Create and login user
    const userPayload = {
      name: 'User for File',
      email: 'fileuser@example.com',
      password: 'password123',
    };
    await request(app).post('/users').send(userPayload);
    const sessionResponse = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const { token } = sessionResponse.body;

    // Upload file
    const response = await request(app)
      .post('/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake image content'), 'test.jpg');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('url');
    expect(response.body.url).toContain('.jpg');
    expect(response.body.url).toContain('http://localhost:3333/files/');
  });
});
