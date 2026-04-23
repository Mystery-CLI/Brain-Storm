import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CourseQueryDto } from './dto/course-query.dto';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all published courses' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by title or description (ILIKE)',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Filter by level',
  })
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
    description: 'Returns paginated published courses',
    schema: { example: { data: [], total: 0, page: 1, limit: 20 } },
  })
  findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns a single course',
    schema: { example: { data: {}, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } },
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({
    schema: {
      example: {
        title: 'Intro to Stellar',
        description: 'Learn Stellar basics',
        level: 'beginner',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
    schema: { example: { data: {}, statusCode: 201, timestamp: '2024-01-01T00:00:00.000Z' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@Body() data: any) {
    return this.coursesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  @ApiBody({ schema: { example: { title: 'Updated title', description: 'Updated description' } } })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
    schema: { example: { data: {}, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.coursesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({
    status: 200,
    description: 'Course deleted successfully',
    schema: { example: { data: {}, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  delete(@Param('id') id: string) {
    return this.coursesService.delete(id);
  }
}
