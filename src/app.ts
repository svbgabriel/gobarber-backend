import 'dotenv/config';

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { Youch } from 'youch';
import routes from './routes';
import httpContext from 'express-http-context';

import './database';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(httpContext.middleware);
app.use(
  '/files',
  express.static(path.resolve(__dirname, '..', 'temp', 'uploads'))
);

app.use(routes);

app.use(
  async (err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      const youch = new Youch();
      const errors = youch.toJSON(err);

      return res.status(500).json(errors);
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
);

export default app;
