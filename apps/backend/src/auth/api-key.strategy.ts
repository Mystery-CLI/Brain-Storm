import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { Repository } from 'typeorm';
import { ApiKey } from './api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepo: Repository<ApiKey>
  ) {
    super(
      { header: 'X-API-KEY', prefix: '' },
      false, // change to false if we don't need req to be passed to verify
      async (apiKey: string, done: (error: Error | null, user?: any) => void) => {
        const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const key = await this.apiKeyRepo.findOne({
          where: { keyHash: hash, isActive: true },
          relations: ['user'],
        });

        if (!key) {
          return done(new UnauthorizedException(), null);
        }

        // Update lastUsedAt in the background
        this.apiKeyRepo.update(key.id, { lastUsedAt: new Date() }).catch(() => {});

        return done(null, key.user);
      }
    );
  }
}
