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
      status: 'SECURE' | 'VULNERABLE' | 'INCONCLUSIVE';
      statusCode?: number;
      errorCode?: string;
      errorMessage?: string;
    }>((resolve) => {
      const knownTlsCertErrors = new Set([
        'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
        'CERT_REVOKED',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'CERT_HAS_EXPIRED',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'ERR_TLS_CERT_ALTNAME_INVALID',
      ]);

      const req = https.get(testCanaryUrl, { timeout: 6000 }, (res) => {
        resolve({
          url: testCanaryUrl,
          status: 'VULNERABLE',
          statusCode: res.statusCode,
          errorMessage: 'ALERTA: La conexión TLS se estableció con éxito; el certificado comprometido fue aceptado por el runtime.',
        });
      });

      req.on('error', (err: any) => {
        const code = err.code || '';
        const isCertRejection = knownTlsCertErrors.has(code) || /certificate|cert|tls/i.test(err.message || '');
        
        if (isCertRejection) {
          resolve({
            url: testCanaryUrl,
            status: 'SECURE',
            errorCode: code || 'TLS_CERT_REJECTED',
            errorMessage: `Certificado comprometido bloqueado correctamente por la cadena de confianza (${err.message})`,
          });
        } else {
          resolve({
            url: testCanaryUrl,
            status: 'INCONCLUSIVE',
            errorCode: code || 'NETWORK_ERROR',
            errorMessage: `Error de red o conectividad externa al endpoint canario: ${err.message}`,
          });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url: testCanaryUrl,
          status: 'INCONCLUSIVE',
          errorCode: 'TIMEOUT',
          errorMessage: 'Tiempo de espera agotado al conectar con el endpoint canario externo (timeout 6s).',
        });
      });
    });

    return {
      status: result.status,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      nodeOptions: process.env.NODE_OPTIONS || 'default',
      renderAdvisory: 'https://render.com/docs/advisory-emudhra',
      audit: {
        canaryTest: result.url,
        verdict:
          result.status === 'SECURE'
            ? 'EXCELENTE: El servidor rechaza los certificados comprometidos de eMudhra conforme al aviso de seguridad de Render.'
            : result.status === 'VULNERABLE'
              ? 'ALERTA: El runtime aceptó el certificado comprometido. Se requiere configurar NODE_VERSION >= 22.23.4 o NODE_OPTIONS="--use-openssl-ca" en Render.'
              : 'INCONCLUSO: No se pudo verificar debido a problemas de conectividad de red o timeout con el servidor canario.',
        rejectionCode: result.errorCode,
        detail: result.errorMessage,
      },
    };
  }
}
