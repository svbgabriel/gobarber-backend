import request from 'supertest';
import { startOfHour, addDays } from 'date-fns';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('Appointment Integration', () => {
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

  it('should be able to create a new appointment', async () => {
    // Create provider
    const providerResponse = await request(app).post('/users').send({
      name: 'Provider User',
      email: 'provider@appointment.com',
      password: 'password123',
      provider: true,
    });
    const provider_id = providerResponse.body.id;

    // Create user and login
    const userPayload = {
      name: 'Regular User',
      email: 'user@appointment.com',
      password: 'password123',
    };
    await request(app).post('/users').send(userPayload);
    const sessionResponse = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const { token } = sessionResponse.body;

    // Create appointment for tomorrow at 10:00
    const date = startOfHour(addDays(new Date(), 1));
    date.setHours(10, 0, 0, 0);

    const response = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider_id,
        date: date.toISOString(),
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.provider_id).toBe(provider_id);
  }, 180000);

  it('should be able to list appointments', async () => {
    // Reuse token from previous test or create a new one
    const userPayload = {
      name: 'User List',
      email: 'list@appointment.com',
      password: 'password123',
    };
    await request(app).post('/users').send(userPayload);
    const sessionResponse = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const { token } = sessionResponse.body;

    const response = await request(app)
      .get('/appointments')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });
});
