import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';
import { User } from '../users/user.entity';
import { Review } from './review.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: 'beginner' })
  level: string;

  @Column({ default: 0 })
  durationHours: number;

  @Column({ default: true })
  isPublished: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: false })
  requiresKyc: boolean;

  @Column({ nullable: true })
  instructorId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @OneToMany(() => CourseModule, (m) => m.course)
  modules: CourseModule[];

  @OneToMany(() => Review, (review) => review.course)
  reviews: Review[];

  averageRating?: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
