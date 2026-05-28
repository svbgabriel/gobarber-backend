import { Request, Response } from 'express';
import * as Yup from 'yup';
import bcrypt from 'bcryptjs';
import { eq, ne, and } from 'drizzle-orm';
import { db } from '../../database/db';
import { users } from '../../database/schema';
import httpContext from 'express-http-context';

class UserController {
  async store(req: Request, res: Response) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string().email().required(),
      password: Yup.string().required().min(6),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { name, email, password, provider } = req.body;

    const [userExists] = await db.select().from(users).where(eq(users.email, email));

    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 8);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        password_hash: passwordHash,
        provider: !!provider,
      })
      .returning();

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
    });
  }

  async update(req: Request, res: Response) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when('password', (password, field) =>
        password ? field.required().oneOf([Yup.ref('password')]) : field
      ),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { email, oldPassword, password } = req.body;

    const userId = httpContext.get('userId');

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user === undefined) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (email && email !== user?.email) {
      const [userExists] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (userExists) {
        return res.status(400).json({ error: 'User already exists.' });
      }
    }

    if (oldPassword && !(await bcrypt.compare(oldPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Password does not match' });
    }

    const updateData: any = { ...req.body };
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 8);
    }
    delete updateData.password;
    delete updateData.oldPassword;
    delete updateData.confirmPassword;

    await db.update(users).set(updateData).where(eq(users.id, userId));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        avatar: true,
      },
    });

    return res.json({
      id: updatedUser!.id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      avatar: updatedUser!.avatar
        ? {
            ...updatedUser!.avatar,
            url: `${process.env.APP_URL}/files/${updatedUser!.avatar.path}`,
          }
        : null,
    });
  }
}

export default new UserController();
