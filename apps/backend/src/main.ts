import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');

  // Use Winston logger as the default logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true }),
    new SanitizationPipe(),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new MetricsInterceptor(app.get(MetricsService)),
  );
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Brain-Storm API')
    .setDescription(
      'Blockchain education platform API powered by Stellar\n\n' +
      '## Authentication\n\n' +
      'This API uses JWT Bearer tokens for authentication.\n\n' +
      '### Getting Started\n\n' +
      '1. **Register**: POST /v1/auth/register with email and password\n' +
      '2. **Login**: POST /v1/auth/login to receive access_token\n' +
      '3. **Authorize**: Click "Authorize" button and enter: `Bearer <access_token>`\n' +
      '4. **Use API**: All protected endpoints now accessible\n\n' +
      '### Example Flow\n\n' +
      '```bash\n' +
      '# Register\n' +
      'curl -X POST https://api.brain-storm.com/v1/auth/register \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"email":"user@example.com","password":"securepass123"}\'\n\n' +
      '# Login\n' +
      'curl -X POST https://api.brain-storm.com/v1/auth/login \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"email":"user@example.com","password":"securepass123"}\'\n\n' +
      '# Use token in subsequent requests\n' +
      'curl -X GET https://api.brain-storm.com/v1/courses \\\n' +
      '  -H "Authorization: Bearer <your_access_token>"\n' +
      '```'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /v1/auth/login',
      },
      'JWT-auth'
    )
    .addServer('/v1', 'API v1')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Export OpenAPI spec for static hosting
  if (process.env.EXPORT_OPENAPI === 'true' || process.argv.includes('--export-openapi')) {
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    logger.log(`OpenAPI spec exported to ${outputPath}`);
    process.exit(0);
  }

  await app.listen(port);
  logger.log(`Brain-Storm API running on port ${port} [${nodeEnv}]`);
}
bootstrap();
