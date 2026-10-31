import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';

/** Used by the TypeORM CLI (migration:generate / run / revert). The app has its own config in AppModule. */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
