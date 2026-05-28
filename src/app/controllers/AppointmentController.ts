import { Request, Response } from 'express';
import * as Yup from 'yup';
import {
  startOfHour,
  parseISO,
  isBefore,
  format,
  subHours,
} from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { db } from '../../database/db';
import { appointments, users } from '../../database/schema';
import Notification from '../schemas/Notification';
import CancelationMail from '../jobs/CancelationMail';
import Queue from '../../lib/Queue';
import httpContext from 'express-http-context';

class AppointmentController {
  async index(req: Request, res: Response) {
    const page = req.query.page ? Number.parseInt(req.query.page.toString()) : 1;
    const userId = httpContext.get('userId');

    const results = await db.query.appointments.findMany({
      where: and(eq(appointments.user_id, userId), isNull(appointments.canceled_at)),
      orderBy: [asc(appointments.date)],
      limit: 20,
      offset: (page - 1) * 20,
      with: {
        provider: {
          with: {
            avatar: true,
          },
        },
      },
    });

    const formattedAppointments = results.map(appointment => ({
      id: appointment.id,
      date: appointment.date,
      past: isBefore(appointment.date, new Date()),
      cancelable: isBefore(new Date(), subHours(appointment.date, 2)),
      provider: appointment.provider
        ? {
            id: appointment.provider.id,
            name: appointment.provider.name,
            avatar: appointment.provider.avatar
              ? {
                  id: appointment.provider.avatar.id,
                  path: appointment.provider.avatar.path,
                  url: `${process.env.APP_URL}/files/${appointment.provider.avatar.path}`,
                }
              : null,
          }
        : null,
    }));

    return res.json(formattedAppointments);
  }

  async store(req: Request, res: Response) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    /**
     * Check if provider_id and user_id are not the same
     */

    const userId = httpContext.get('userId');

    if (provider_id === userId) {
      return res
        .status(401)
        .json({ error: "You can't make an appointment to yourself" });
    }

    /*
     * Check if provider_id is a provider
     */

    const isProvider = await db.query.users.findFirst({
      where: and(eq(users.id, provider_id), eq(users.provider, true)),
    });

    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }

    // Check for past dates
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    // Check date availability
    const checkAvailability = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.provider_id, provider_id),
        isNull(appointments.canceled_at),
        eq(appointments.date, hourStart)
      ),
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    const [appointment] = await db
      .insert(appointments)
      .values({
        user_id: userId,
        provider_id: provider_id,
        date: hourStart,
      })
      .returning();

    /*
     * Notify appointment provider
     */

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const formattedData = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      {
        locale: pt,
      }
    );

    await Notification.create({
      content: `Novo agendamento de ${user!.name} para ${formattedData}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req: Request, res: Response) {
    const appointmentId = Number.parseInt(req.params.id.toString());
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
      with: {
        provider: true,
        user: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const userId = httpContext.get('userId');

    if (appointment.user_id !== userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment.",
      });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancela appointments 2 hours in advance.',
      });
    }

    const [updatedAppointment] = await db
      .update(appointments)
      .set({ canceled_at: new Date() })
      .where(eq(appointments.id, appointmentId))
      .returning();

    await Queue.add(CancelationMail.key, {
      appointment: {
        ...updatedAppointment,
        provider: appointment.provider,
        user: appointment.user,
      },
    });

    return res.json(updatedAppointment);
  }
}

export default new AppointmentController();
