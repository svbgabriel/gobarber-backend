import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  MongoDBContainer,
  StartedMongoDBContainer,
} from '@testcontainers/mongodb';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { Sequelize } from 'sequelize';

let postgresContainer: StartedPostgreSqlContainer;
let mongoContainer: StartedMongoDBContainer;
let redisContainer: StartedRedisContainer;
let sequelize: Sequelize;

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
  databaseConfig.port = postgresContainer.getMappedPort(5432).toString();
  databaseConfig.username = postgresContainer.getUsername();
  databaseConfig.password = postgresContainer.getPassword();
  databaseConfig.database = postgresContainer.getDatabase();

  const User = (await import('../../../src/app/models/User')).default;
  const File = (await import('../../../src/app/models/File')).default;
  const Appointment = (await import('../../../src/app/models/Appointment'))
    .default;

  sequelize = new Sequelize({
    dialect: 'postgres',
    host: postgresContainer.getHost(),
    port: postgresContainer.getMappedPort(5432),
    username: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    database: postgresContainer.getDatabase(),
    define: databaseConfig.define,
    logging: false,
  });

  const models = [User, File, Appointment];
  models
    .map((model) => model.init(sequelize))
    .map((model) => model.associate && model.associate(sequelize.models));

  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  // Reinicializar o singleton do database para garantir que o App use a conexão correta
  const database = (await import('../../../src/database')).default;
  database.init();

  return { postgresContainer, mongoContainer, redisContainer, sequelize };
};

export const stopContainers = async () => {
  if (sequelize) await sequelize.close();
  if (postgresContainer) await postgresContainer.stop();
  if (mongoContainer) await mongoContainer.stop();
  if (redisContainer) await redisContainer.stop();
};
