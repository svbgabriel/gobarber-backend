import jwt from 'jsonwebtoken';
import * as Yup from 'yup';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../database/db';
import { users } from '../../database/schema';
import authConfig from '../../config/auth';
import { Request, Response } from 'express';

class SessionController {
  async store(req: Request, res: Response) {
    const schema = Yup.object().shape({
      email: Yup.string().email().required(),
      password: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        avatar: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Password does not match' });
    }

    const { id, name, avatar, provider } = user;

    return res.json({
      user: {
        id,
        name,
        email,
        provider,
        avatar: avatar
          ? {
              ...avatar,
              url: `${process.env.APP_URL}/files/${avatar.path}`,
            }
          : null,
      },
      token: jwt.sign({ id }, authConfig.secret!, {
        expiresIn: Number.parseInt(authConfig.expiresIn),
      }),
    });
  }
}

export default new SessionController();
