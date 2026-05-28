import { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../database/db';
import { users } from '../../database/schema';
import Notification from '../schemas/Notification';
import httpContext from 'express-http-context';

class NotificationController {
  async index(_req: Request, res: Response) {
    const userId = httpContext.get('userId');

    const isProvider = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.provider, true)),
    });

    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'Only providers can load notifications' });
    }

    const notifications = await Notification.find({
      user: userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);

    return res.json(notifications);
  }

  async update(req: Request, res: Response) {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    return res.json(notification);
  }
}

export default new NotificationController();
