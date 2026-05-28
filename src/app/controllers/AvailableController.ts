import { Request, Response } from 'express';
import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  format,
  isAfter,
} from 'date-fns';
import { eq, and, isNull, between } from 'drizzle-orm';
import { db } from '../../database/db';
import { appointments } from '../../database/schema';

class AvailableController {
  async index(req: Request, res: Response) {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    let providerIdParam: string
    if (Array.isArray(req.params.providerId)) {
      providerIdParam = req.params.providerId[0]
    } else {
      providerIdParam = req.params.providerId
    }

    const searchDate = Number(date);
    const providerId = Number.parseInt(providerIdParam);

    const results = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.provider_id, providerId),
          isNull(appointments.canceled_at),
          between(appointments.date, startOfDay(searchDate), endOfDay(searchDate))
        )
      );

    const schedule = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
    ];

    const available = schedule.map((time) => {
      const [hour, minute] = time.split(':');
      const value = setSeconds(
        setMinutes(setHours(searchDate, Number.parseInt(hour)), Number.parseInt(minute)),
        0
      );

      return {
        time,
        value: format(value, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        available:
          isAfter(value, new Date()) &&
          !results.find((a) => format(a.date, 'HH:mm') === time),
      };
    });

    return res.json(available);
  }
}

export default new AvailableController();
