import request from 'supertest';
import { startOfHour, addDays } from 'date-fns';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('Notification Integration', () => {
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

  it('should be able to list and update notifications', async () => {
    // 1. Create provider and login
    const providerPayload = {
      name: 'Provider User',
      email: 'provider@notification.com',
      password: 'password123',
      provider: true,
    };
    await request(app).post('/users').send(providerPayload);
    const providerSession = await request(app).post('/sessions').send({
      email: providerPayload.email,
      password: providerPayload.password,
    });
    const providerToken = providerSession.body.token;
    const providerId = providerSession.body.user.id;

    // 2. Create user and login
    const userPayload = {
      name: 'Regular User',
      email: 'user@notification.com',
      password: 'password123',
    };
    await request(app).post('/users').send(userPayload);
    const userSession = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const userToken = userSession.body.token;

    // 3. Create appointment (generates notification)
    const date = startOfHour(addDays(new Date(), 1));
    await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        provider_id: providerId,
        date: date.toISOString(),
      });

    // 4. List notifications as provider
    const listResponse = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toBeInstanceOf(Array);
    expect(listResponse.body.length).toBeGreaterThanOrEqual(1);

    const notificationId = listResponse.body[0]._id;

    // 5. Mark notification as read
    const updateResponse = await request(app)
      .put(`/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.read).toBe(true);
  });
});
