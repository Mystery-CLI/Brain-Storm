import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  stellarPublicKey: string;

  @Column({ default: 'student' })
  role: string;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @Column({ nullable: true, type: 'varchar' })
  verificationToken: string | null;

  @Column({ nullable: true, type: 'datetime' })
  verificationTokenExpiresAt: Date | null;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true })
  mfaSecret: string | null;

  @Column({ unique: true, nullable: true })
  referralCode: string;

  @Column({ nullable: true, type: 'varchar' })
  referredBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
