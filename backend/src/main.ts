import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const proxyHops = config.getOrThrow<number>('TRUST_PROXY');
  if (proxyHops > 0) {
    app.set('trust proxy', proxyHops);
  }

  setupApp(app);
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN') });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('FlowForge API')
      .setDescription('Team project management: projects, tasks, Kanban ordering, comments and history.')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  new Logger('Bootstrap').log(`API running on http://localhost:${port}/api (docs at /api/docs)`);
}

bootstrap();
