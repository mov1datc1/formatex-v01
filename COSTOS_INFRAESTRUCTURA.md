# Desglose de Costos de Infraestructura - Formatex WMS 360+

Este documento detalla los costos recurrentes asociados con el alojamiento, bases de datos y servicios en la nube necesarios para mantener el sistema **Formatex WMS 360+** operando en un entorno de producción de alta disponibilidad, así como los entornos de prueba para un desarrollo seguro.

## Arquitectura y Flujo de Trabajo (Git Flow)

Para mantener la estabilidad operativa del almacén, el código se maneja mediante ramas profesionales (`main` para producción, `dev` para pruebas/staging, y `feature`/`hotfix` para desarrollo). La infraestructura debe soportar estos múltiples entornos:

1. **Supabase**: Base de Datos PostgreSQL, Autenticación y Almacenamiento.
2. **Render**: Alojamiento del Backend (API NestJS).
3. **Vercel**: Alojamiento del Frontend (Portal Web).

---

## 1. Supabase (Base de Datos y Autenticación)
Es el núcleo de los datos. El plan Pro es **estrictamente necesario** para producción, ya que evita "pausas" por inactividad y garantiza respaldos. Además, esta capa es vital porque **incluye la funcionalidad de Branching** (ramas de base de datos) necesaria para nuestro flujo.

- **Plan Requerido**: Pro
- **Costo**: $25 USD / mes
- **Soporte para Entornos**:
  - **Producción (`main`)**: Base de datos principal.
  - **Staging/Pruebas (`dev`)**: El plan Pro incluye hasta 2 ramas de BD en la nube sin costo extra, perfecto para aislar las pruebas de Control de Calidad (QA).
  - **Desarrollo (`feature`/`hotfix`)**: Los desarrolladores operan bases de datos locales gratuitas (Supabase CLI) en sus computadoras.

## 2. Render (Servidor Backend)
Aquí se ejecuta la lógica central del WMS. Al tener un flujo de ramas separado, necesitamos **dos servidores activos en la nube**: uno potente para el piso de operación (Producción) y uno básico para las pruebas del equipo (Staging).

- **Backend Producción (`main`)**: Plan Standard ($25 USD / mes). Garantiza 512MB RAM, sin "cold starts" y alto rendimiento para escáneres y portal web.
- **Backend Staging (`dev`)**: Plan Starter ($7 USD / mes). Sirve exclusivamente para probar los cambios antes de subirlos al almacén real.
- **Costo Total Render**: $32 USD / mes

## 3. Vercel (Servidor Frontend)
Aquí vive la interfaz gráfica. Los términos de Vercel prohíben el uso comercial en su capa gratuita, por lo que se requiere una licencia Pro. La gran ventaja es que **Vercel maneja los entornos múltiples automáticamente y de forma ilimitada sin costo extra**.

- **Plan Requerido**: Pro
- **Costo**: $20 USD / mes (1 cuenta/asiento)
- **Soporte para Entornos**:
  - Genera automáticamente un entorno de "Preview" (una URL única) por cada rama que subamos (`feature`, `hotfix`, `dev`), permitiendo probar y aprobar cambios visuales de inmediato sin cargos adicionales.

## 4. Dominio (Opcional)
Renovación anual del nombre de dominio para producción (ej. `wms.formatex.com.mx`).
- **Costo Promedio**: ~$20 USD / año (Equivalente a ~$1.66 USD / mes).

## 5. Proveedor de Facturación CFDI 4.0 (FacturAPI)
Para el módulo de facturación integrado en el WMS, el proveedor elegido es **FacturAPI**. Es importante notar que FacturAPI **no ofrece un esquema de sellos (timbres) ilimitados**, ya que en México todos los PACs pagan derechos al SAT por cada timbre emitido.

Su modelo es de **Pago por Consumo** (Paquetes de folios prepagados o cobro por volumen) y se factura en Pesos Mexicanos (MXN):

- **Suscripción de la API**: $0 (Gratuita. No hay costo fijo mensual por usar la plataforma).
- **Costo por Timbre (CFDI)**: Depende del volumen. Un rango estándar de la industria varía entre $0.50 y $1.00 MXN por factura, reduciéndose a mayor volumen.
- **Multi-Sucursal**: Permite registrar múltiples RFCs emisores en la misma cuenta sin costo extra.
- **Sugerencia:** Comprar un paquete de folios prepagado (ej. 5,000 o 10,000 timbres) basándose en su histórico anual para obtener la mejor tarifa.

---

## Resumen de Inversión en Infraestructura (Producción + Pruebas)

Este presupuesto asegura alta disponibilidad en Producción y un flujo profesional de pruebas (Staging) para evitar interrumpir la operación.

| Servicio | Entorno Asignado | Plan | Costo Mensual (USD) | Costo Anual (USD) |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase** | Producción (`main`) + Staging (`dev`) | Pro | $25.00 | $300.00 |
| **Render** | Producción (`main`) | Standard | $25.00 | $300.00 |
| **Render** | Staging (`dev`) | Starter | $7.00 | $84.00 |
| **Vercel** | Todos (Previews automáticos) | Pro | $20.00 | $240.00 |
| **Dominio** | Producción (`main`) | Renovación | $1.66 | $20.00 |
| **TOTAL** | | | **$78.66 USD / mes** | **$944.00 USD / año** |

*(Nota: El gasto de folios de FacturAPI se paga por separado en MXN).*

---

### Notas Importantes
1. **Propiedad de la Infraestructura:** Crear las cuentas (Vercel, Render, Supabase) a nombre de **Formatex** con tarjeta corporativa de la empresa.
2. **Operación Segura:** La inversión en Staging y Branching nos permite validar urgencias y mejoras en un entorno idéntico al real, asegurando 0 bugs en Producción.
3. **Impuestos:** Precios en USD. No incluyen posibles comisiones por pagos internacionales.

---

## Anexo: Planes de Soporte Técnico y Mantenimiento

Para garantizar la continuidad operativa, seguridad de los datos y mejora del sistema, ofrecemos esquemas de soporte técnico (independientes a la infraestructura).

### Clasificación de Fallas (Niveles de Tickets)
- **Nivel 1 (Crítico):** Sistema caído (ej. nadie puede iniciar sesión) o proceso medular bloqueado (recepción, surtido, facturación) sin alternativa.
- **Nivel 2 (Alto):** Falla en función importante, pero existe alternativa temporal (*workaround*) para seguir operando sin detener el almacén.
- **Nivel 3 (Medio/Bajo):** Errores visuales, dudas de uso, configuración de módulos o bugs menores que no impiden el trabajo.

### Opciones de Paquetes de Soporte

#### 1. Plan Básico (Mantenimiento y "Seguro de Vida")
*Diseñado para proteger la información y garantizar que el sistema levante ante una catástrofe, sin requerir desarrollos nuevos.*
- **Inversión Mensual:** **$150 - $200 USD**
- **Gestión de Backups:** Supervisión de respaldos automatizados.
- **Restauración (DRP):** Ejecución del *Disaster Recovery Plan* ante caída masiva. (SLA: 48 horas máximo).
- **Cobertura:** Exclusivo para resolución de fallas **Nivel 1**.
- **Horas de Soporte:** **0 horas** (No incluye horas para consultas, nivel 2/3 o funciones nuevas).

#### 2. Plan Standard (Operación Continua)
*Recomendado para asegurar que la operación diaria fluya y apoyar al equipo en dudas técnicas o ajustes.*
- **Inversión Mensual:** **$450 - $500 USD**
- **Gestión de Backups y DRP:** Restauración prioritaria ante desastres. (SLA: 24 horas máximo).
- **Cobertura:** Fallas **Nivel 1 y Nivel 2**.
- **Horas de Soporte:** **10 horas / mes** dedicadas a:
  - Tickets Nivel 3 y bugs no críticos.
  - Ajustes menores al sistema.
  - Resolución de dudas del personal.
  - *(Nota: Horas no acumulables. Errores por mala manipulación de datos descuentan horas de la bolsa).*

#### 3. Plan Premium (Cobertura Total y Evolución)
*Para operaciones logísticas que requieren acompañamiento constante y creación continua de nuevas herramientas en el sistema.*
- **Inversión Mensual:** **$850 - $1,000 USD**
- **Gestión de Backups y DRP:** Restauración de máxima prioridad. (SLA: 4 a 8 horas máximo).
- **Cobertura:** Atención prioritaria **Nivel 1, Nivel 2 y Nivel 3**.
- **Horas de Soporte:** **20 horas / mes** dedicadas a:
  - Desarrollo de nuevas características (*Features*).
  - Consultoría técnica y optimización de procesos logísticos.
  - Soporte directo (WhatsApp/Llamadas).
  - Monitoreo proactivo de errores (solución antes de que el usuario reporte).
