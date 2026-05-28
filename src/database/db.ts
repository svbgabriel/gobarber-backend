import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dbConfig from '../config/database';

const pool = new Pool(dbConfig);

export const db = drizzle(pool, { schema });

export const closeConnection = async () => {
  await pool.end();
};
