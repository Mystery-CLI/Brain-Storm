import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StellarService } from './stellar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('stellar')
@Controller('stellar')
export class StellarController {
  constructor(private stellarService: StellarService) {}

  @Get('balance/:publicKey')
  @ApiOperation({ summary: 'Get Stellar account balance' })
  @ApiResponse({ status: 200, description: 'Returns account balances' })
  getBalance(@Param('publicKey') publicKey: string) {
    return this.stellarService.getAccountBalance(publicKey);
  }

  @Post('mint')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: manually mint reward tokens' })
  @ApiResponse({ status: 201, description: 'Tokens minted, returns txHash' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  mintReward(@Body() body: { recipientPublicKey: string; amount: number }) {
    return this.stellarService.mintReward(body.recipientPublicKey, body.amount);
  }
}
