import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  let app;
  if (process.env.NODE_ENV === 'development') {
    app = await NestFactory.create(AppModule, {
      httpsOptions: {
        key: fs.readFileSync(path.join(__dirname, '..', 'secrets/localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '..', 'secrets/localhost.pem')),
      },
    });
  } else {
    app = await NestFactory.create(AppModule);
  }
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({
    // origin: [process.env.CLIENT_URL, 'https://player-holotv.ru'],
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // preflightContinue: false,
    // credentials: true,
    // optionsSuccessStatus: 200,

    // origin: [process.env.CLIENT_URL, 'https://player-holotv.ru'],
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT);
}
bootstrap();
