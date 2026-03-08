import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PythonServiceManager } from './python-service-manager.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { SearchModule } from './search/search.module.js';
import { QuizzesModule } from './quizzes/quizzes.module.js';
import { QuestionsModule } from './questions/questions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,   // 1 minute window
          limit: 100,   // 100 requests per minute globally
        },
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SubjectsModule,
    MaterialsModule,
    SearchModule,
    QuizzesModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PythonServiceManager,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
