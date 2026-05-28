import request from 'supertest';
import { startOfHour, addDays, getTime } from 'date-fns';
import { startContainers, stopContainers } from '../helpers/database-container';

describe('Available Integration', () => {
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

  it('should be able to list available times for a provider', async () => {
    // 1. Create provider
    const providerPayload = {
      name: 'Provider User',
      email: 'provider@available.com',
      password: 'password123',
      provider: true,
    };
    const providerResponse = await request(app)
      .post('/users')
      .send(providerPayload);
    const providerId = providerResponse.body.id;

    // 2. Create user and login
    const userPayload = {
      name: 'Regular User',
      email: 'user@available.com',
      password: 'password123',
    };
    await request(app).post('/users').send(userPayload);
    const userSession = await request(app).post('/sessions').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const userToken = userSession.body.token;

    // 3. Create appointment at 10:00 tomorrow
    const appointmentDate = startOfHour(addDays(new Date(), 1));
    appointmentDate.setHours(10, 0, 0, 0);

    await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        provider_id: providerId,
        date: appointmentDate.toISOString(),
      });

    // 4. Check available times
    const searchDate = getTime(appointmentDate);
    const response = await request(app)
      .get(`/providers/${providerId}/available?date=${searchDate}`)
      .set('Authorization', `Bearer ${userToken}`);

    const body: {
      time: string;
      value: string;
      available: boolean;
    }[] = response.body;

    expect(response.status).toBe(200);
    expect(body).toBeInstanceOf(Array);

    const tenOClock = body.find((a) => a.time === '10:00');
    expect(tenOClock?.available).toBe(false);

    const nineOClock = body.find((a) => a.time === '09:00');
    expect(nineOClock?.available).toBe(true);
  });
});
