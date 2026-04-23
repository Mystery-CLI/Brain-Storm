import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Course } from './course.entity';
import { CourseQueryDto } from './dto/course-query.dto';

@Injectable()
export class CoursesService {
  private readonly CACHE_KEY = 'courses:all';
  private readonly CACHE_TTL = 60;

  constructor(
    @InjectRepository(Course) private repo: Repository<Course>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async findAll(query: CourseQueryDto = {}) {
    const { search, level, page = 1, limit = 20 } = query;

    const qb = this.repo
      .createQueryBuilder('course')
      .where('course.isPublished = :isPublished', { isPublished: true })
      .andWhere('course.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      qb.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (level) {
      qb.andWhere('course.level = :level', { level });
    }

    const total = await qb.clone().getCount();
    const offset = (page - 1) * limit;

    const { raw, entities } = await qb
      .leftJoin('course.reviews', 'review')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'course_averageRating')
      .skip(offset)
      .take(limit)
      .orderBy('course.createdAt', 'DESC')
      .groupBy('course.id')
      .getRawAndEntities();

    const averageRatings = new Map(
      raw.map((item, index) => [entities[index].id, Number(item.course_averageRating) || 0])
    );

    const data = entities.map((course) => ({
      ...course,
      averageRating: averageRatings.get(course.id) ?? 0,
    }));

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.repo.findOne({ where: { id, isDeleted: false } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: Partial<Course>) {
    const course = await this.repo.save(this.repo.create(data));
    await this.invalidateCache();
    return course;
  }

  async update(id: string, data: Partial<Course>) {
    const course = await this.findOne(id);
    if (!course) throw new NotFoundException('Course not found');
    const updated = await this.repo.save({ ...course, ...data });
    await this.invalidateCache();
    return updated;
  }

  async delete(id: string) {
    const course = await this.findOne(id);
    if (!course) throw new NotFoundException('Course not found');
    const removed = await this.repo.remove(course);
    await this.invalidateCache();
    return removed;
  }

  private async invalidateCache() {
    await this.cacheManager.del(this.CACHE_KEY);
  }
}
