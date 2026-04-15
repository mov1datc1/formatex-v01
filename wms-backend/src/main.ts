import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      /\.vercel\.app$/,
      /\.onrender\.com$/,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation pipe
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

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('WMS 360+ Formatex')
    .setDescription('API del Sistema de Gestión de Almacén para Formatex - Distribuidora de Telas')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación')
    .addTag('admin', 'Administración')
    .addTag('catalog', 'Catálogos (SKUs, Proveedores, Clientes)')
    .addTag('inventory', 'Inventario (HUs, Stock, Movimientos)')
    .addTag('reception', 'Recepción de Rollos')
    .addTag('orders', 'Pedidos')
    .addTag('cutting', 'Corte de Rollos')
    .addTag('fulfillment', 'Empaque y Envío')
    .addTag('warehouse', 'Almacén y Ubicaciones')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🏭 WMS 360+ Formatex API corriendo en: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
