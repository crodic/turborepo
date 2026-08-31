import { type AllConfigType } from '@/config/config.type';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getPackageVersion } from './app-version.util';

function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService<AllConfigType>);
  const appName = configService.getOrThrow('app.name', { infer: true });

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('A boilerplate project')
    .setVersion(getPackageVersion())
    .setContact(
      'Crodic Crystal',
      'https://crodic.id.vn',
      'alice01422@gmail.com',
    )
    .addBearerAuth()
    .addServer(
      configService.getOrThrow('app.url', { infer: true }),
      'Development',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    autoTagControllers: true,
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
    linkNameFactory(_controllerKey, methodKey, _fieldKey) {
      return methodKey;
    },
  });

  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: appName,
    customfavIcon: '/favicon.png',
    swaggerOptions: {
      displayOperationId: true,
      persistAuthorization: true,
      explorer: true,
      filter: true,
      displayRequestDuration: true,
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
      deepLinking: true,
      defaultModelsExpandDepth: -1,
      downloadUrl: true,
      urls: [
        { url: '/api-docs-json', name: 'Framework NestJS API Documentation' },
      ],
    },
    customCss: `
      .swagger-ui .topbar .download-url-wrapper {
        display: flex !important;
      }
    `,
  });
}

export default setupSwagger;
