import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CredentialsService } from './credentials.service';
import { CertificatePdfService } from './certificate-pdf.service';

@ApiTags('credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credentials')
export class CredentialsController {
  constructor(
    private credentialsService: CredentialsService,
    private certificatePdfService: CertificatePdfService,
  ) {}

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download a credential as a PDF certificate' })
  @ApiResponse({ status: 200, description: 'PDF certificate generated successfully' })
  async downloadPdf(@Param('id') id: string) {
    const credential = await this.credentialsService.findOne(id);
    const pdf = this.certificatePdfService.generateCertificatePdf(credential);
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="credential-${id}.pdf"`,
      type: 'application/pdf',
    });
  }

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
  @UseGuards(AuthGuard(['jwt', 'api-key']), RolesGuard)
  @Roles('admin')
  @ApiSecurity('X-API-KEY')
  @ApiOperation({ summary: 'Issue a credential — accepts JWT (admin) or service API key' })
  @ApiResponse({ status: 201, description: 'Credential issued' })
  @ApiResponse({ status: 401, description: 'Unauthorized — provide a valid JWT or X-API-KEY header' })
  issue(@Body() body: { userId: string; courseId: string; stellarPublicKey: string }) {
    return this.credentialsService.issue(body.userId, body.courseId, body.stellarPublicKey);
  }
}
