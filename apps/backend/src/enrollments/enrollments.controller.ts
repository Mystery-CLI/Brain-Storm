import { Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post('courses/:id/enroll')
  @ApiOperation({ summary: 'Enroll the current user in a course' })
  @ApiResponse({
    status: 201,
    description: 'Enrolled successfully',
    schema: {
      example: {
        id: 'uuid',
        userId: 'uuid',
        courseId: 'uuid',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  enroll(@Param('id') courseId: string, @Request() req: { user: { id: string } }) {
    return this.enrollmentsService.enroll(req.user.id, courseId);
  }

  @Delete('courses/:id/enroll')
  @ApiOperation({ summary: 'Unenroll the current user from a course' })
  @ApiResponse({ status: 200, description: 'Unenrolled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  unenroll(@Param('id') courseId: string, @Request() req: { user: { id: string } }) {
    return this.enrollmentsService.unenroll(req.user.id, courseId);
  }

  @Get('users/:id/enrollments')
  @ApiOperation({ summary: 'Get all enrollments for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of enrollments',
    schema: { example: [{ id: 'uuid', courseId: 'uuid', createdAt: '2024-01-01T00:00:00.000Z' }] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserEnrollments(@Param('id') userId: string) {
    return this.enrollmentsService.findByUser(userId);
  }
}
