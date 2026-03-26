import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';
import { RecordProgressDto } from './dto/record-progress.dto';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post('progress')
  @ApiOperation({ summary: 'Record lesson completion and update progress' })
  @ApiResponse({ status: 201, description: 'Progress recorded' })
  record(@Request() req, @Body() dto: RecordProgressDto) {
    return this.progressService.record(
      req.user.id,
      dto,
      req.user.stellarPublicKey,
    );
  }

  @Get('users/:id/progress')
  @ApiOperation({ summary: 'Get all progress records for a user' })
  @ApiResponse({ status: 200, description: 'List of progress records' })
  findByUser(@Param('id') id: string) {
    return this.progressService.findByUser(id);
  }
}
