import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: [
      process.env.WEB_ADMIN_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      'http://localhost:8082',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('PilatesMS API')
    .setDescription('Pilates Studio Management System - API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Users', 'User management')
    .addTag('Members', 'Member management')
    .addTag('Instructors', 'Instructor management')
    .addTag('Branches', 'Branch & Room management')
    .addTag('Equipment', 'Equipment management')
    .addTag('Classes', 'Class & Schedule management')
    .addTag('Bookings', 'Booking management')
    .addTag('Packages', 'Package & Member Package management')
    .addTag('Transactions', 'Transaction & Payment management')
    .addTag('Check-ins', 'Check-in management')
    .addTag('Reports', 'Reports & Analytics')
    .addTag('Reviews', 'Customer & Instructor reviews and ratings (UC1.8, R3.6)')
    .addTag('Teaching', 'Instructor teaching, workout plans & student progress (R3.1-R3.7)')
    .addTag('Promotions', 'Promotions & discount vouchers (R5.2, R5.3)')
    .addTag('System', 'System configuration, audit logs, backup & restore (R7.4-R7.7)')
    .addTag('Products', 'Store retail products & merchandise (UC5.1)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 PilatesMS Backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs at: http://localhost:${port}/api`);
}

bootstrap();
