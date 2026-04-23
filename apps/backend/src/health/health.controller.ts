import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HttpHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private http: HttpHealthIndicator,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Returns the health status of the application including database, Redis, and Stellar Horizon connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'All health checks passed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: { type: 'object', properties: { status: { type: 'string', example: 'up' } } },
            memory_heap: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            memory_rss: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            stellar_horizon: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: { type: 'object', properties: { status: { type: 'string', example: 'up' } } },
            memory_heap: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            memory_rss: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            stellar_horizon: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more health checks failed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        info: { type: 'object' },
        error: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: { status: { type: 'string', example: 'down' } },
            },
          },
        },
        details: { type: 'object' },
      },
    },
  })
  @HealthCheck()
  async check() {
    this.logger.debug('Performing health check', { context: 'HealthController' });

    const result = await this.health.check([
      // Database connectivity check
      () => this.db.pingCheck('database'),

      // Memory usage checks
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB heap limit
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB RSS limit

      // Redis connectivity check
      () => this.checkRedis(),

      // Stellar Horizon connectivity check
      () => this.checkStellarHorizon(),
    ]);

    this.logger.info('Health check completed', {
      context: 'HealthController',
      status: result.status,
      checks: Object.keys(result.details || {}).length,
    });

    return result;
  }

  /**
   * Custom health check for Redis connectivity
   */
  private async checkRedis(): Promise<HealthIndicatorResult> {
    const key = 'health-check';
    const testValue = Date.now().toString();

    try {
      // Test Redis connectivity by setting and getting a value
      await this.cacheManager.set(key, testValue, 1000); // 1 second TTL
      const retrievedValue = await this.cacheManager.get(key);

      if (retrievedValue === testValue) {
        return {
          redis: {
            status: 'up',
            message: 'Redis is responsive',
          },
        };
      } else {
        throw new Error('Redis value mismatch');
      }
    } catch (error) {
      this.logger.warn('Redis health check failed', {
        context: 'HealthController',
        error: error.message,
      });
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  /**
   * Custom health check for Stellar Horizon connectivity
   */
  private async checkStellarHorizon() {
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

    try {
      // Check Horizon health endpoint
      return await this.http.pingCheck('stellar_horizon', `${horizonUrl}/health`);
    } catch (error) {
      this.logger.warn('Stellar Horizon health check failed', {
        context: 'HealthController',
        url: horizonUrl,
        error: error.message,
      });
      throw error;
    }
  }
}
