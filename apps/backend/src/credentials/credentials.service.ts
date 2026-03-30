import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './credential.entity';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(Credential) private repo: Repository<Credential>,
    private stellarService: StellarService,
  ) {}

  async issue(userId: string, courseId: string, stellarPublicKey: string): Promise<Credential> {
    // Avoid duplicate credentials
    const existing = await this.repo.findOne({ where: { userId, courseId } });
    if (existing) return existing;

    const txHash = await this.stellarService.issueCredential(stellarPublicKey, courseId);

    // Mint reward tokens after credential issuance
    try {
      await this.stellarService.mintReward(stellarPublicKey, 100);
    } catch {
      // Non-fatal
    }

    const credential = this.repo.create({ userId, courseId, txHash, stellarPublicKey });
    return this.repo.save(credential);
  }

  findByUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { issuedAt: 'DESC' } });
  }

  async findOne(id: string) {
    const credential = await this.repo.findOne({
      where: { id },
      relations: ['user', 'course'],
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  async verify(txHash: string) {
    const credential = await this.repo.findOne({ where: { txHash } });
    const onChain = await this.stellarService.verifyCredential(txHash);
    return { credential, ...onChain };
  }
}
