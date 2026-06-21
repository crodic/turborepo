import { type AllConfigType } from '@/config/config.type';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService<AllConfigType>);
  const appName = configService.getOrThrow('app.name', { infer: true });

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('A boilerplate project')
    .setVersion('1.0')
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
    operationIdFactory: (controllerKey, methodKey) => methodKey,
    linkNameFactory(controllerKey, methodKey, fieldKey) {
      return methodKey;
    },
  });

  // ==============================
  // 🧹 FILTER CONFIG
  // ==============================
  const excludedPaths: string[] = ['/__nestlens__', '/nestlens'];

  const excludedTags: string[] = ['NestLens'];

  // ==============================
  // 🧹 Remove paths by prefix
  // ==============================
  Object.keys(document.paths).forEach((path) => {
    if (excludedPaths.some((p) => path.startsWith(p))) {
      delete document.paths[path];
    }
  });

  // ==============================
  // 🧹 Remove tags
  // ==============================
  if (document.tags) {
    document.tags = document.tags.filter(
      (tag) => !excludedTags.includes(tag.name),
    );
  }

  // ==============================
  // 🧹 Remove operations that use excluded tags
  // ==============================
  Object.entries(document.paths).forEach(([path, pathItem]) => {
    Object.keys(pathItem).forEach((method) => {
      const operation = pathItem[method];

      if (
        operation?.tags &&
        operation.tags.some((t) => excludedTags.includes(t))
      ) {
        delete document.paths[path][method];
      }
    });

    // Remove empty pathItem
    if (Object.keys(pathItem).length === 0) {
      delete document.paths[path];
    }
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
