import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../database/db';
import { users } from '../../database/schema';

class ProviderController {
  async index(_req: Request, res: Response) {
    const providers = await db.query.users.findMany({
      where: eq(users.provider, true),
      with: {
        avatar: true,
      },
    });

    const formattedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      avatar_id: provider.avatar_id,
      avatar: provider.avatar
        ? {
            name: provider.avatar.name,
            path: provider.avatar.path,
            url: `${process.env.APP_URL}/files/${provider.avatar.path}`,
          }
        : null,
    }));

    return res.json(formattedProviders);
  }
}

export default new ProviderController();
