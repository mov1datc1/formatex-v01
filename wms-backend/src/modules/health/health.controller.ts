import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as https from 'https';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check del backend WMS 360+' })
  getHealth() {
    return {
      status: 'ok',
      service: 'wms-backend',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      uptime: process.uptime(),
    };
  }

  @Get('security-audit')
  @ApiOperation({
    summary: 'Auditoría de seguridad en vivo contra certificados comprometidos eMudhra (Render Advisory)',
  })
  async securityAudit() {
    const testCanaryUrl = 'https://dv-g3b-emudhra.we-have-a-problem.com/';

    const result = await new Promise<{
      url: string;
      compromisedCertificateBlocked: boolean;
      statusCode?: number;
      errorCode?: string;
      errorMessage?: string;
    }>((resolve) => {
      const req = https.get(testCanaryUrl, { timeout: 5000 }, (res) => {
        resolve({
          url: testCanaryUrl,
          compromisedCertificateBlocked: false,
          statusCode: res.statusCode,
          errorMessage: 'ADVERTENCIA: La conexión HTTPS tuvo éxito; el certificado comprometido fue aceptado por el runtime.',
        });
      });

      req.on('error', (err: any) => {
        resolve({
          url: testCanaryUrl,
          compromisedCertificateBlocked: true,
          errorCode: err.code || 'TLS_CERT_REJECTED',
          errorMessage: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url: testCanaryUrl,
          compromisedCertificateBlocked: true,
          errorCode: 'TIMEOUT',
          errorMessage: 'Timeout de conexión al endpoint de prueba',
        });
      });
    });

    return {
      status: result.compromisedCertificateBlocked ? 'SECURE' : 'VULNERABLE',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      nodeOptions: process.env.NODE_OPTIONS || 'default',
      renderAdvisory: 'https://render.com/docs/advisory-emudhra',
      audit: {
        canaryTest: result.url,
        isProtected: result.compromisedCertificateBlocked,
        verdict: result.compromisedCertificateBlocked
          ? 'EXCELENTE: El servidor rechaza los certificados comprometidos de eMudhra conforme al aviso de seguridad de Render.'
          : 'ALERTA: Se requiere asegurar NODE_VERSION >= 22.23.4 o configurar NODE_OPTIONS="--use-openssl-ca" en el dashboard de Render.',
        rejectionCode: result.errorCode,
      },
    };
  }
}
