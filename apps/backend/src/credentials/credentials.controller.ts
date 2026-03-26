import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CredentialsService } from './credentials.service';

@ApiTags('credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credentials')
export class CredentialsController {
  constructor(private credentialsService: CredentialsService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'List all credentials for a user' })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  findByUser(@Param('userId') userId: string) {
    return this.credentialsService.findByUser(userId);
  }

  @Get('verify/:txHash')
  @ApiOperation({ summary: 'Verify a credential on-chain by txHash' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  verify(@Param('txHash') txHash: string) {
    return this.credentialsService.verify(txHash);
  }

  @Post('issue')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: manually issue a credential' })
  @ApiResponse({ status: 201, description: 'Credential issued' })
  issue(@Body() body: { userId: string; courseId: string; stellarPublicKey: string }) {
    return this.credentialsService.issue(body.userId, body.courseId, body.stellarPublicKey);
  }
}
