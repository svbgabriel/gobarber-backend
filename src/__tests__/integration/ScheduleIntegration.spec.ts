import request from 'supertest';
import { startOfHour, addDays } from 'date-fns';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('Schedule Integration', () => {
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

  it('should be able to list provider schedule', async () => {
    // Create provider and login
    const providerPayload = {
      name: 'Provider User',
      email: 'provider@schedule.com',
      password: 'password123',
      provider: true,
    };
    await request(app).post('/users').send(providerPayload);
    const sessionResponse = await request(app).post('/sessions').send({
      email: providerPayload.email,
      password: providerPayload.password,
    });
    const { token, user: provider } = sessionResponse.body;

    // Create user
    const userPayload = {
      name: 'Regular User',
      email: 'user@schedule.com',
      password: 'password123',
    };
    const userResponse = await request(app).post('/users').send(userPayload);
    const user_id = userResponse.body.id;

    // Create appointment for this provider
    const date = startOfHour(addDays(new Date(), 1));
    date.setHours(10, 0, 0, 0);

    // Login as regular user to create appointment
    const userSession = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const userToken = userSession.body.token;

    await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        provider_id: provider.id,
        date: date.toISOString(),
      });

    // List schedule as provider
    const response = await request(app)
      .get(`/schedule?date=${date.toISOString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0].user.name).toBe('Regular User');
  });
});
