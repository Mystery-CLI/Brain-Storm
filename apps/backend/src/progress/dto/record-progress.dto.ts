import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordProgressDto {
  @ApiProperty({ description: 'Course ID' })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({ description: 'Lesson ID (optional)' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty({ description: 'Progress percentage (0-100)', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct: number;
}
