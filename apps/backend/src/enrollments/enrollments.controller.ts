import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post('courses/:id/enroll')
  enroll(
    @Param('id') courseId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.enrollmentsService.enroll(req.user.id, courseId);
  }

  @Delete('courses/:id/enroll')
  unenroll(
    @Param('id') courseId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.enrollmentsService.unenroll(req.user.id, courseId);
  }

  @Get('users/:id/enrollments')
  getUserEnrollments(@Param('id') userId: string) {
    return this.enrollmentsService.findByUser(userId);
  }
}
