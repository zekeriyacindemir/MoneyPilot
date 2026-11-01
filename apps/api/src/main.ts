import type { Request, Response, NextFunction } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Environment } from './config/environment.validation';
import { requestLogger } from './http/request-logger.middleware';

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const application = await NestFactory.create<NestExpressApplication>(AppModule, {
    // One JSON object per line is what hosted log services parse best.
    logger: new ConsoleLogger({ json: isProduction, colors: !isProduction }),
  });
  const configuration = application.get(ConfigService<Environment, true>);
  const environment = configuration.get('NODE_ENV', { infer: true });

  // Without this, every client behind a reverse proxy shares the proxy's IP in rate limiting.
  application.set('trust proxy', configuration.get('TRUST_PROXY', { infer: true }));
  // Stops schedulers and closes database connections cleanly on SIGTERM (deploys, restarts).
  application.enableShutdownHooks();
  application.use(requestLogger);
  application.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    if (environment === 'production') {
      // The API only serves JSON (Swagger UI is disabled in production).
      response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  application.enableCors({
    origin: configuration.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (environment !== 'production') {
    const documentConfiguration = new DocumentBuilder()
      .setTitle('MoneyPilot API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const document = SwaggerModule.createDocument(application, documentConfiguration);
    SwaggerModule.setup('docs', application, document);
  }

  await application.listen(configuration.get('API_PORT', { infer: true }));
}

void bootstrap();
