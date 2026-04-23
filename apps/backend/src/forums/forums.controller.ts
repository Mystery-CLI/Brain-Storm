import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ForumsService } from './forums.service';

@ApiTags('forums')
@Controller()
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Get('courses/:id/posts')
  @ApiOperation({ summary: 'Get forum posts for a course' })
  @ApiResponse({ status: 200, description: 'Returns course forum posts' })
  findByCourse(@Param('id') courseId: string) {
    return this.forumsService.findPostsByCourse(courseId);
  }

  @Post('courses/:id/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a forum post for a course' })
  @ApiResponse({ status: 201, description: 'Forum post created successfully' })
  createPost(
    @Param('id') courseId: string,
    @Request() req: { user: { id: string; role: string } },
    @Body() dto: CreatePostDto
  ) {
    return this.forumsService.createPost(courseId, req.user.id, req.user.role, dto);
  }

  @Post('posts/:id/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a forum post' })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  createReply(
    @Param('id') postId: string,
    @Request() req: { user: { id: string; role: string } },
    @Body() dto: CreateReplyDto
  ) {
    return this.forumsService.createReply(postId, req.user.id, req.user.role, dto);
  }
}
