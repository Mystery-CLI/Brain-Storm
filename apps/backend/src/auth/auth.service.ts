import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './refresh-token.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepo: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    const { token, hash, expiresAt } = this.generateOpaqueToken(24);

    const user = await this.usersService.create({
      email,
      passwordHash,
      isVerified: false,
      verificationToken: hash,
      verificationTokenExpiresAt: expiresAt,
    });

    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isVerified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }
    return this.issueTokenPair(user.id, user.email);
  }

  async refresh(rawRefreshToken: string) {
    const hash = this.hashToken(rawRefreshToken);

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash, revoked: false },
    });

    if (!stored) throw new UnauthorizedException('Invalid or revoked refresh token');
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token (rotation)
    await this.refreshTokenRepo.save({ ...stored, revoked: true });

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException('User not found');

    return this.issueTokenPair(user.id, user.email);
  }

  async logout(rawRefreshToken: string) {
    const hash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash, revoked: false },
    });
    if (stored) {
      await this.refreshTokenRepo.save({ ...stored, revoked: true });
    }
    return { message: 'Logged out successfully.' };
  }

  async verifyEmail(token: string) {
    const hash = this.hashToken(token);
    const user = await this.usersService.findByVerificationToken(hash);

    if (!user) throw new BadRequestException('Invalid or expired verification token');
    if (user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Email is already verified');

    const { token, hash, expiresAt } = this.generateOpaqueToken(24);
    await this.usersService.update(user.id, {
      verificationToken: hash,
      verificationTokenExpiresAt: expiresAt,
    });

    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'Verification email resent.' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await this.resetTokenRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId: user.id })
      .andWhere('t.createdAt > :since', { since: oneHourAgo })
      .getCount();

    if (recentTokens >= 3) {
      throw new BadRequestException('Too many reset requests. Please wait before trying again.');
    }

    const { token, hash, expiresAt } = this.generateOpaqueToken(1);
    await this.resetTokenRepo.save(
      this.resetTokenRepo.create({ tokenHash: hash, userId: user.id, expiresAt, used: false }),
    );

    await this.mailService.sendPasswordResetEmail(user.email, token);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = this.hashToken(token);
    const resetToken = await this.resetTokenRepo.findOne({
      where: { tokenHash: hash, used: false },
    });

    if (!resetToken) throw new BadRequestException('Invalid or expired reset token');
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(resetToken.userId, { passwordHash });
    await this.resetTokenRepo.save({ ...resetToken, used: true });

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async issueTokenPair(userId: string, email: string) {
    const access_token = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: '15m' },
    );

    const { token: rawRefresh, hash, expiresAt } = this.generateOpaqueToken(24 * 7); // 7 days
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ tokenHash: hash, userId, expiresAt, revoked: false }),
    );

    return { access_token, refresh_token: rawRefresh };
  }

  private generateOpaqueToken(ttlHours: number) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return { token, hash, expiresAt };
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
