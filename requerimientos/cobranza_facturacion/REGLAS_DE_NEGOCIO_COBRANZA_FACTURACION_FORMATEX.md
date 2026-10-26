# Formatex WMS 360° · Especificación de Reglas de Negocio y Operación
## Módulo de Finanzas, Crédito, Cobranza, Facturación & Comisiones
**Versión 1.0 Oficial Consolidada · Sesión de Trabajo con Dirección de Finanzas (26 de Octubre de 2026)**

---

### Metadatos del Documento
- **Organización Solicitante:** Forma Textil S. de R.L. de C.V. (Formatex - Guadalajara, Jalisco)
- **Socio Tecnológico:** Movida TCI LLC
- **Fecha de Levantamiento:** Lunes, 26 de Octubre de 2026
- **Participantes de Formatex:**
  - César (Director de Finanzas, Crédito y Cobranza)
  - Andrea Ramírez (ATC / Operaciones)
  - Santiago (Comercial)
  - Mayra García (Administración)
- **Participantes de Movida TCI:**
  - Jonathan Palacios (Dirección Técnica / Ingeniería WMS 360+)
- **Archivo DOCX Generado:** `requerimientos/cobranza_facturacion/REGLAS_DE_NEGOCIO_COBRANZA_FACTURACION_FORMATEX.docx`

---

## 1. Resumen Ejecutivo y Alcance
El presente documento formaliza las reglas de negocio, directrices operativas y tratamientos fiscales acordados con César (Director de Finanzas, Crédito y Cobranza) para el sistema Formatex WMS 360°. Este módulo representa el engranaje crítico entre la captura comercial (ATC/Ventas), la operación física del almacén (Surtido/Corte/Empaque) y la certeza patrimonial ante el Servicio de Administración Tributaria (SAT).

> [!IMPORTANT]
> **Principio Rector Financiero:**
> Ninguna mercancía sale de rampa si no cuenta con respaldo bancario confirmado (en clientes de contado) o con autorización explícita y negociada de Cobranza (en clientes de crédito). Las comisiones de ventas operan bajo la estricta máxima: *"Mes trabajado = Mes cobrado"*. No se comisiona ni un centavo sobre facturas con saldos insolutos pendientes.

---

## 2. Política de Cobranza y Liberación de Pedidos

### 2.1 Clientes de Contado (Verificación Bancaria Obligatoria)
1. ATC genera la cotización y recibe el comprobante por WhatsApp/Email.
2. El pedido entra a la cola de Cobranza en estado `PAGO_RECIBIDO` (no visible para picker ni almacén).
3. El analista de cobranza valida el estado de cuenta bancario (BBVA Bancomer / Santander), corrobora la referencia y presiona **"Validar Pago"**.
4. El sistema registra `cobradorNombre`, `fechaAprobCobranza` y cambia el estado a `POR_SURTIR`, liberando el pedido a la Torre de Despacho de Almacén.

### 2.2 Clientes de Crédito y Manejo de Pedidos Retenidos (`RETENIDO_CREDITO`)
- **Plazos comerciales oficiales:** 7, 15, 30, 45 y 60 días naturales.
- **Regla de Captura Permitida pero Retención Automática:**
  - El sistema **NUNCA** bloquea la captura del pedido en ATC. El cliente o agente puede registrar el pedido para que "se ilusionen" y se mantenga el registro de su necesidad.
  - Sin embargo, si el cliente presenta facturas vencidas o sobregiro de línea, el pedido pasa automáticamente al estado **`RETENIDO_CREDITO`**.
  - El pedido retenido **NO pasa a surtido ni aparta tela indefinidamente**. Se mantiene en espera de que Cobranza negocie la recuperación de cartera.

### 2.3 Criterios de Negociación Discrecional de Cobranza
La liberación de un pedido retenido es una facultad estrictamente discrecional de César y su equipo. No se somete a una fórmula matemática rígida:
- *Ejemplo:* Si el cliente debe 4 facturas por $60,000 MXN y mete pedido urgente de $15,000 MXN, Cobranza negocia: *"Deposítame $25,000 MXN a facturas viejas y te libero este pedido nuevo"*.
- En el WMS 360°, el botón **"Liberar Pedido por Negociación"** solicita obligatoriamente el ingreso de notas de negociación, registra el usuario responsable y transfiere el pedido a `POR_SURTIR`.

### 2.4 Tolerancia Financiera de Redondeo (±$10.00 MXN)
Por diferencias de comisiones bancarias, redondeos en cotizaciones de metros fraccionarios o ajustes en ventanilla, César cuenta con una tolerancia de **±$10.00 MXN**. Si el saldo restante de una factura tras aplicar un abono es menor o igual a $10.00 MXN, el sistema permite marcar la factura como `PAGADA` al 100%, absorbiendo la discrepancia sin alterar la póliza contable.

---

## 3. Cobranza Preventiva Automatizada (Alerta a 5 Días)
Exactamente cinco (5) días naturales antes de que expire la fecha límite de pago de una factura de crédito (PPD), el WMS enviará un correo automático personalizado al cliente con copia al agente de ventas asignado.

### Plantilla Oficial de Correo de Cobranza Preventiva Formatex
```text
ASUNTO: Recordatorio Preventivo: Tu Factura {{folioFactura}} está próxima a vencer - Formatex

Estimado(a) {{nombreCliente}},

Esperamos que te encuentres excelente. En Formatex valoramos enormemente tu preferencia y queremos apoyarte para mantener tu cuenta al corriente y asegurar que tus pedidos futuros y disponibilidad de telas se procesen con la máxima agilidad.

Te recordamos que tu factura {{folioFactura}}, con un saldo pendiente de {{montoInsoluto}} MXN, tiene fecha límite de vencimiento el próximo {{fechaVencimiento}} (quedan {{diasRestantes}} días naturales).

DATOS DE PAGO:
• Beneficiario: FORMA TEXTIL S. DE R.L. DE C.V.
• Banco: BBVA Bancomer | Cuenta: 0112345678 | CLABE: 012320001123456789
• Referencia: {{codigoPedido}} / {{folioFactura}}

Una vez realizado tu depósito o transferencia, te agradeceremos compartir el comprobante al correo cobranza@formatex.mx o a través de tu asesor comercial {{agenteVentas}} para aplicar tu pago de inmediato y emitir tu Complemento de Pago (REP).

Agradecemos de antemano tu puntualidad y quedamos a tus órdenes.

Atentamente,
Departamento de Crédito y Cobranza
Forma Textil S. de R.L. de C.V. | Guadalajara, Jalisco
```

---

## 4. Facturación CFDI 4.0 y Tratamiento Fiscal (SAT / Facturapi)

### 4.1 Momento Preciso de Emisión
La factura fiscal CFDI 4.0 se emite exclusivamente cuando el pedido ha sido completamente surtido y empacado (estado `EMPACADO`). En este punto se conoce el metraje exacto empacado en rollos y cortes, eliminando al 100% las diferencias de centavos o metros entre cotización y factura.

### 4.2 Facturas PUE (Contado) - Prohibición Absoluta de Complemento REP
- Conforme al Anexo 20 del SAT, facturas `PUE` amparan operaciones pagadas antes o al momento de la emisión.
- La aplicación del cobro de facturas PUE es puramente interna (**"No Timbrada"**).
- Queda **estrictamente prohibido emitir Recibo Electrónico de Pago (REP / CFDI tipo P)** para facturas PUE.

### 4.3 Facturas PPD (Crédito) y Complemento de Pago por Cada Abono
- Se emiten como `PPD` con forma de pago `99 Por Definir`.
- **Cada abono o transferencia bancaria** que realiza el cliente —incluso si es un abono parcial de $5,000 MXN a una factura de $25,000 MXN— **REQUIERE OBLIGATORIAMENTE su propio Complemento de Pago (REP) timbrado ante el SAT vía Facturapi**, relacionando el UUID de la factura origen y especificando saldos anterior e insoluto.

### 4.4 Notas de Crédito y Devoluciones con Relación CFDI
Cualquier devolución física o ajuste por flete/garantía genera una Nota de Crédito (CFDI tipo Egreso) timbrada ante el SAT con tipo de relación `01` (Nota de crédito) o `03` (Devolución) vinculada al UUID de la factura origen.

---

## 5. Reglamento Oficial de Comisiones de Ventas

### 5.1 Regla Madre: "Mes Trabajado = Mes Cobrado"
Las comisiones no se generan por cotizaciones ni por facturación. El derecho nace estrictamente cuando la factura ha sido **pagada al 100%**. Si una factura tiene saldo pendiente al cierre de mes, no genera comisión en ese periodo.

### 5.2 Fecha de Corte y Dispersión: Día 10 de Cada Mes
Las comisiones se liquidan mensualmente los días 10 de cada mes, cubriendo las facturas cobradas en el mes calendario inmediato anterior. César remite a cada asesor su estado de cuenta individualizado por correo confidencial. Ningún vendedor puede ver los importes de sus colegas.

### 5.3 Base de Cálculo Gravable e Impacto de Notas de Crédito
- La comisión se calcula sobre el **Monto Bruto (subtotal de tela antes de IVA y retenciones)**.
- Cualquier devolución física o nota de crédito por garantía/flete **resta directamente la base comisionable**.
  - *Ejemplo:* Factura de $1,000 MXN. Devolución de $200 MXN + Nota de crédito de $300 MXN = Base ajustada de $500 MXN. La comisión se calcula exclusivamente sobre los $500 MXN netos cobrados.

### 5.4 Cadena Jerárquica de Comisiones
| Rol Jerárquico | Base de Cálculo | Porcentaje / Regla |
| :--- | :--- | :--- |
| **1. Agente / Vendedor de Campo** | Subtotal neto cobrado de clientes asignados a su cartera | Variable según lista de precios (F1 a F10) asignada al pedido |
| **2. Gerente de Ventas** | Subtotal neto cobrado de todos los agentes que integran su equipo | Porcentaje menor fijo sobre la venta consolidada de su grupo |
| **3. Dirección Comercial** | Subtotal neto cobrado de todos los gerentes de ventas | Mismo porcentaje del gerente, multiplicado por los 3-4 gerentes a su cargo |

### 5.5 Requisito Fiscal Indispensable del Vendedor
Para liberar el pago bancario de la comisión, el agente o gerente debe emitir y enviar una factura fiscal (CFDI de ingresos bajo RESICO o Persona Física con Actividad Empresarial) cuyo importe antes de impuestos cuadre exactamente con el cálculo de César.

---

## 6. Mesa de Corte: Bonificaciones por Defectos de Fábrica ("Banderas")
Durante el corte en almacén, si un rollo presenta defectos de origen (hasta 5 defectos por rollo: manchas, hilados corridos o "banderas"), el cortador aplica una bonificación física de metraje adicional (20 a 50 cm).

> [!CAUTION]
> **Las Dos Reglas de Oro en Bonificaciones de Corte:**
> 1. **EN FACTURA (COSTO CERO):** La bonificación **NUNCA** debe facturarse ni sumarse al total a cobrar. Si se cortaron 1.50m (1.20m pedidos + 0.30m de bonificación), la factura sale estrictamente por 1.20m. De lo contrario, se elevaría el saldo y se descuadraría el depósito bancario confirmado por César.
> 2. **EN INVENTARIO (DESCUENTO REAL DEL MARBETE):** Los 0.30m regalados salieron físicamente del rollo matriz. Por ende, el cortador debe registrar la bonificación en su terminal para que el marbete HU remanente se actualice con el metraje real y no se generen "metros fantasma" en el WMS.

---

## 7. Reservas Protegidas para Clientes Especiales (Caso "Seth")
Para clientes clave de alto volumen (ej. cliente "Seth") que colocan pedidos superiores a 1,000 metros y tardan de dos semanas a un mes en pagar, el WMS 360° dispondrá de:
- Un sub-almacén virtual / apartado protegido: `RESERVADO_CLIENTE_ESPECIAL`.
- Los rollos quedan bloqueados para venta general, pero plenamente identificados para el cliente con un candado de tiempo autorizado por Dirección.

---

## 8. Matriz de Cambios Técnicos en el Sistema
| Componente / Archivo | Ajuste Técnico Requerido | Objetivo Operativo |
| :--- | :--- | :--- |
| `wms-backend/prisma/schema.prisma` | Campos `retenidoCredito`, `bonificacionCorteMetros`, `diasCreditoAutorizados` en `ClientCreditConfig` y `Order` | Soporte de retención de crédito, bonificaciones a costo cero y plazos oficiales |
| `wms-backend/.../invoicing.service.ts` | Tolerancia de absorción de ±$10.00 MXN en `registerPayment` y bifurcación PUE (no timbrado) vs PPD (REP timbrado) | Cuadre contable de César y cumplimiento fiscal con Facturapi |
| `wms-backend/.../commissions.service.ts` | Cálculo sobre bruto cobrado, deducción de notas de crédito y agrupación jerárquica (Vendedor, Gerente, Director) | Reporte mensual día 10 para pago de comisiones con factura |
| `wms-frontend/.../CobranzaPage.tsx` | Pestaña "Retenidos por Crédito" con botón de liberación discrecional por negociación de César | Visibilidad y control total de pedidos retenidos por deuda vencida |
| `wms-frontend/.../CortadorView.tsx` | Campo de Bonificación por Defecto (metros) a costo cero que descuenta del rollo | Eliminación de metros fantasma en almacén sin alterar cotización |
