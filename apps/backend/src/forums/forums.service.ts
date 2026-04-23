import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/course.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { Post } from './post.entity';
import { Reply } from './reply.entity';

@Injectable()
export class ForumsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Reply)
    private readonly replyRepo: Repository<Reply>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>
  ) {}

  async findPostsByCourse(courseId: string) {
    await this.ensureCourseExists(courseId);

    return this.postRepo.find({
      where: { courseId },
      relations: ['user', 'replies', 'replies.user'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async createPost(courseId: string, userId: string, role: string, dto: CreatePostDto) {
    await this.ensureCourseExists(courseId);

    if (dto.isPinned && !this.canModerate(role)) {
      throw new ForbiddenException('Only instructors and admins can pin posts');
    }

    const post = this.postRepo.create({
      courseId,
      userId,
      title: dto.title.trim(),
      content: dto.content.trim(),
      isPinned: Boolean(dto.isPinned && this.canModerate(role)),
    });

    return this.postRepo.save(post);
  }

  async createReply(postId: string, userId: string, role: string, dto: CreateReplyDto) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (dto.isAnswer && !this.canModerate(role)) {
      throw new ForbiddenException('Only instructors and admins can mark answers');
    }

    if (dto.isAnswer) {
      await this.replyRepo.update({ postId, isAnswer: true }, { isAnswer: false });
    }

    const reply = this.replyRepo.create({
      postId,
      userId,
      content: dto.content.trim(),
      isAnswer: Boolean(dto.isAnswer && this.canModerate(role)),
    });

    const savedReply = await this.replyRepo.save(reply);

    if (savedReply.isAnswer) {
      post.answerReplyId = savedReply.id;
      await this.postRepo.save(post);
    }

    return savedReply;
  }

  private async ensureCourseExists(courseId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, isDeleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }
  }

  private canModerate(role: string) {
    return role === 'admin' || role === 'instructor';
  }
}
