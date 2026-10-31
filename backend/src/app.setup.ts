import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

/** Settings shared by the real server and the e2e tests, so tests exercise the same pipeline. */
export function setupApp(app: INestApplication) {
  app.use(
    helmet({
      // This API only returns JSON, so CSP adds nothing and would break the Swagger UI page.
      contentSecurityPolicy: false,
      // The web app lives on another origin and reads our responses via CORS.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // ...and reject the request instead of ignoring them
      transform: true, // run the @Transform decorators on DTOs
    }),
  );
}
