import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Environment } from './config/environment.validation';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(AppModule);
  const configuration = application.get(ConfigService<Environment, true>);
  const environment = configuration.get('NODE_ENV', { infer: true });

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
