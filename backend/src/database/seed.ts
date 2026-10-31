import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';

/** Creates the first admin. Run once with `npm run seed`. */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
  }

  try {
    await app.get(UsersService).create({
      email: email.toLowerCase(),
      name: 'Admin',
      password,
      role: UserRole.ADMIN,
    });
    console.log(`Admin created: ${email}`);
  } catch (err) {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

seed();
