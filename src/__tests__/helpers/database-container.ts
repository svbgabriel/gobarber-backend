import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  MongoDBContainer,
  StartedMongoDBContainer,
} from '@testcontainers/mongodb';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';

let postgresContainer: StartedPostgreSqlContainer;
let mongoContainer: StartedMongoDBContainer;
let redisContainer: StartedRedisContainer;

export const startContainers = async () => {
  // Start Postgres
  postgresContainer = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('gobarber_test')
    .withUsername('postgres')
    .withPassword('docker')
    .start();

  // Start MongoDB
  mongoContainer = await new MongoDBContainer('mongo:8.2').start();

  // Start Redis
  redisContainer = await new RedisContainer('redis:alpine').start();

  // Set environment variables for the app to pick up
  process.env.DB_HOST = postgresContainer.getHost();
  process.env.DB_USER = postgresContainer.getUsername();
  process.env.DB_PASS = postgresContainer.getPassword();
  process.env.DB_NAME = postgresContainer.getDatabase();
  process.env.DB_PORT = postgresContainer.getMappedPort(5432).toString();
  process.env.MONGO_URL = mongoContainer.getConnectionString() + '?directConnection=true';
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
  process.env.APP_SECRET = 'gobarber-test-secret';

  // Load models dynamically to avoid premature initialization
  const databaseConfig = (await import('../../../src/config/database')).default;

  // Update the config object directly so the singleton picks it up
  databaseConfig.host = postgresContainer.getHost();
  databaseConfig.port = postgresContainer.getMappedPort(5432);
  databaseConfig.user = postgresContainer.getUsername();
  databaseConfig.password = postgresContainer.getPassword();
  databaseConfig.database = postgresContainer.getDatabase();

  const { db } = await import('../../../src/database/db');

  // Run Drizzle migrations
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../../database/migrations_drizzle'),
  });

  return { postgresContainer, mongoContainer, redisContainer };
};

export const stopContainers = async () => {
  try {
    const { closeConnection } = await import('../../../src/database/db');
    await closeConnection();
  } catch (err) {
    // Ignore if not yet initialized
  }
  if (postgresContainer) await postgresContainer.stop();
  if (mongoContainer) await mongoContainer.stop();
  if (redisContainer) await redisContainer.stop();
};
