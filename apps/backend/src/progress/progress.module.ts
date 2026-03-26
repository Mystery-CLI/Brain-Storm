import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Progress } from './progress.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { StellarModule } from '../stellar/stellar.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [TypeOrmModule.forFeature([Progress]), StellarModule, CredentialsModule],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
