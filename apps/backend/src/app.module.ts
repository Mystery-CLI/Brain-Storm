import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { UsersModule } from './users/users.module';
import { StellarModule } from './stellar/stellar.module';
import { ProgressModule } from './progress/progress.module';
import { CredentialsModule } from './credentials/credentials.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoggerModule } from './common/logger'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { KycModule } from './kyc/kyc.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ForumsModule } from './forums/forums.module';
import * as redisStore from 'cache-manager-redis-store';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.get<string>('nodeEnv') !== 'production',
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        url: config.get<string>('redis.url'),
        ttl: 60,
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') || 60000,
            limit: config.get<number>('throttle.limit') || 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          config.get<string>('redis.url') || 'redis://localhost:6379'
        ),
      }),
    }),
    AuthModule,
    CoursesModule,
    UsersModule,
    StellarModule,
    ProgressModule,
    CredentialsModule,
    LeaderboardModule,
    ForumsModule,
    NotificationsModule,
    HealthModule,
    MetricsModule,
    KycModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
