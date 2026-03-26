import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './progress.entity';
import { RecordProgressDto } from './dto/record-progress.dto';
import { StellarService } from '../stellar/stellar.service';
import { CredentialsService } from '../credentials/credentials.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress) private repo: Repository<Progress>,
    private stellarService: StellarService,
    private credentialsService: CredentialsService,
  ) {}

  async record(userId: string, dto: RecordProgressDto, stellarPublicKey: string) {
    let progress = await this.repo.findOne({
      where: { userId, courseId: dto.courseId },
    });

    if (!progress) {
      progress = this.repo.create({ userId, courseId: dto.courseId });
    }

    progress.lessonId = dto.lessonId ?? progress.lessonId;
    progress.progressPct = dto.progressPct;

    if (dto.progressPct >= 100) {
      progress.completedAt = new Date();
    }

    // Record on-chain
    try {
      const txHash = await this.stellarService.recordProgress(
        stellarPublicKey,
        dto.courseId,
        dto.progressPct,
      );
      progress.txHash = txHash;
    } catch (err) {
      // Non-fatal: store progress off-chain even if on-chain call fails
    }

    const saved = await this.repo.save(progress);

    // Auto-issue credential at 100%
    if (dto.progressPct >= 100) {
      await this.credentialsService.issue(userId, dto.courseId, stellarPublicKey);
    }

    return saved;
  }

  findByUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }
}
