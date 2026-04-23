import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User } from '../users/user.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { setupTestDatabase, teardownTestDatabase } from '../test/integration-test.setup';

describe('AuthService (Integration)', () => {
  let service: AuthService;
  let usersService: UsersService;
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forFeature([User, PasswordResetToken, RefreshToken]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '15m' } }),
      ],
      providers: [
        AuthService,
        UsersService,
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    })
      .overrideProvider('DataSource')
      .useValue(dataSource)
      .compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    const userRepo = dataSource.getRepository(User);
    const resetTokenRepo = dataSource.getRepository(PasswordResetToken);
    const refreshTokenRepo = dataSource.getRepository(RefreshToken);
    await userRepo.clear();
    await resetTokenRepo.clear();
    await refreshTokenRepo.clear();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await service.register('newuser@example.com', 'password123');

      expect(result.message).toContain('Registration successful');

      const user = await usersService.findByEmail('newuser@example.com');
      expect(user).toBeDefined();
      expect(user.isVerified).toBe(false);
    });

    it('should reject duplicate email', async () => {
      await service.register('duplicate@example.com', 'password123');

      await expect(service.register('duplicate@example.com', 'password123')).rejects.toThrow(
        'Email already in use'
      );
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await usersService.create({
        email: 'login@example.com',
        passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', // 'password'
        isVerified: true,
        isBanned: false,
      });
    });

    it('should login with valid credentials', async () => {
      const result = await service.login('login@example.com', 'password');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should reject invalid password', async () => {
      await expect(service.login('login@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should reject unverified user', async () => {
      await usersService.create({
        email: 'unverified@example.com',
        passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm',
        isVerified: false,
      });

      await expect(service.login('unverified@example.com', 'password')).rejects.toThrow(
        'Please verify your email'
      );
    });

    it('should reject banned user', async () => {
      await usersService.create({
        email: 'banned@example.com',
        passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm',
        isVerified: true,
        isBanned: true,
      });

      await expect(service.login('banned@example.com', 'password')).rejects.toThrow(
        'Account is banned'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      await usersService.create({
        email: 'verify@example.com',
        passwordHash: 'hash',
        isVerified: false,
        verificationToken: 'test-token-hash',
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Note: In real scenario, token would be hashed
      const result = await service.verifyEmail('test-token');

      expect(result.message).toContain('Email verified successfully');
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset', async () => {
      await usersService.create({
        email: 'forgot@example.com',
        passwordHash: 'hash',
        isVerified: true,
      });

      const result = await service.forgotPassword('forgot@example.com');

      expect(result.message).toContain('reset link has been sent');
    });

    it('should return generic message for non-existent email', async () => {
      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.message).toContain('reset link has been sent');
    });
  });
});
