import { Injectable } from '@nestjs/common';
import { Credential } from './credential.entity';

@Injectable()
export class CertificatePdfService {
  generateCertificatePdf(credential: Credential) {
    const recipient = credential.user?.username || credential.user?.email || credential.userId;
    const courseTitle = credential.course?.title || credential.courseId;
    const issuedAt = credential.issuedAt.toISOString().slice(0, 10);
    const verificationRef = credential.txHash || credential.id;

    const lines = [
      { size: 26, x: 140, y: 730, text: 'Certificate of Completion' },
      { size: 14, x: 72, y: 670, text: 'This certifies that' },
      { size: 22, x: 72, y: 635, text: recipient },
      { size: 14, x: 72, y: 595, text: 'has successfully completed the course' },
      { size: 20, x: 72, y: 560, text: courseTitle },
      { size: 12, x: 72, y: 500, text: `Issued: ${issuedAt}` },
      { size: 12, x: 72, y: 478, text: `Credential ID: ${credential.id}` },
      { size: 12, x: 72, y: 456, text: `Verification Ref: ${verificationRef}` },
      { size: 12, x: 72, y: 415, text: 'Scan target / verify payload:' },
      { size: 10, x: 72, y: 392, text: `brain-storm://credentials/${credential.id}/verify` },
    ];

    const stream = [
      'BT',
      '/F1 18 Tf',
      ...lines.map(
        ({ size, x, y, text }) =>
          `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${this.escapePdfText(text)}) Tj ET`,
      ),
      'ET',
    ].join('\n');

    return this.buildPdf(stream);
  }

  private buildPdf(content: string) {
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private escapePdfText(value: string) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }
}
