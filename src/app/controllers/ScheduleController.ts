import { Request, Response } from 'express';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { eq, and, isNull, between, asc } from 'drizzle-orm';
import { db } from '../../database/db';
import { appointments, users } from '../../database/schema';
import httpContext from 'express-http-context';

class ScheduleController {
  async index(req: Request, res: Response) {
    const userId = httpContext.get('userId');

    const checkUserProvider = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.provider, true)),
    });

    if (!checkUserProvider) {
      return res.status(401).json({ error: 'User is not a provider' });
    }

    const { date } = req.query;

    if (!date) {
      return res.status(401).json({ error: 'Date is invalid' });
    }

    const parsedDate = parseISO(date.toString());

    const results = await db.query.appointments.findMany({
      where: and(
        eq(appointments.provider_id, userId),
        isNull(appointments.canceled_at),
        between(appointments.date, startOfDay(parsedDate), endOfDay(parsedDate))
      ),
      with: {
        user: true,
      },
      orderBy: [asc(appointments.date)],
    });

    const formattedAppointments = results.map(appointment => ({
      id: appointment.id,
      date: appointment.date,
      user: appointment.user
        ? {
            name: appointment.user.name,
          }
        : null,
    }));

    return res.json(formattedAppointments);
  }
}

export default new ScheduleController();
