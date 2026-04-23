import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByVerificationToken(hash: string) {
    return this.repo.findOne({ where: { verificationToken: hash } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByStellarPublicKey(stellarPublicKey: string) {
    return this.repo.findOne({ where: { stellarPublicKey } });
  }

  create(data: Partial<User>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<User>) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, ...data });
  }

  async findAll(
    options: {
      page?: number;
      limit?: number;
      role?: string;
      isVerified?: boolean;
      search?: string;
    } = {}
  ) {
    const { page = 1, limit = 10, role, isVerified, search } = options;

    const query = this.repo.createQueryBuilder('user');

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (isVerified !== undefined) {
      query.andWhere('user.isVerified = :isVerified', { isVerified });
    }

    if (search) {
      query.andWhere('user.email ILIKE :search', { search: `%${search}%` });
    }

    query.andWhere('user.deletedAt IS NULL');

    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async banUser(id: string, isBanned: boolean) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, isBanned });
  }

  async changeRole(id: string, role: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, role });
  }

  async softDelete(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, deletedAt: new Date() });
  }

  findByReferralCode(code: string) {
    return this.repo.findOne({ where: { referralCode: code } });
  }

  async getReferralStats(userId: string) {
    const count = await this.repo.count({ where: { referredBy: userId } });
    return { referralCount: count, earnedBst: count * 50 };
  }
}
