import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { promisify } from 'node:util';
import authConfig from '../../config/auth';
import httpContext from 'express-http-context';

export default async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const verify = promisify(jwt.verify)
    // @ts-expect-error
    const decoded: any = await verify(token, authConfig.secret);

    httpContext.set('userId', decoded.id);

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
};
