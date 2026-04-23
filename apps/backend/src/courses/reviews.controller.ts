import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('courses/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a completed course enrollment' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  create(
    @Param('id') courseId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReviewDto
  ) {
    return this.reviewsService.create(courseId, req.user.id, dto);
  }

  @Get('courses/:id/reviews')
  @ApiOperation({ summary: 'List reviews for a course' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated course reviews',
    schema: { example: { data: [], total: 0, page: 1, limit: 20 } },
  })
  findByCourse(@Param('id') courseId: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findByCourse(courseId, query);
  }
}
