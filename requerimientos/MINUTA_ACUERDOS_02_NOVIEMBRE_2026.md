# Correo de Minuta — Ajustes Operativos y Validación Presencial WMS 360+ Formatex

**Fecha:** 2 de Noviembre de 2026  
**Para:** Equipo Directivo y Operativo Formatex (Alma, Andrea Ramírez, Israel, César, Elba Vázquez, Santiago, Don Ricardo Pérez)  
**CC:** Jonathan Palacios, Ricardo Zerpa (Movida TCI)  
**Asunto:** Minuta de Acuerdos y Ajustes Resueltos (02/Nov/2026) — WMS 360+ Formatex  

---

Estimado equipo de Formatex,

Compartimos la minuta ejecutiva de la sesión presencial del **2 de noviembre de 2026**, detallando cada **solicitud**, su **resolución en plataforma** y su **estatus actual**:

### 1. Precios Especiales por Cliente y Tela (ATC / Catálogo)
- **Solicitud:** Cuando un cliente tiene precio especial autorizado únicamente en ciertas telas, al cotizar múltiples telas el sistema debe aplicar en automático el precio especial en las telas convenidas y el precio base de lista en las demás, además de permitir a Alma dar de alta nuevos convenios aprobados por Dirección.
- **Resolución:** Se automatizó el cálculo línea por línea en el cotizador (`Cliente + Tela = Precio Especial`; resto de partidas = `Precio de Lista`) y se habilitó el alta directa para Alma (`JEFE_ATC`) en `Catálogos -> Precios Especiales`.
- **Estatus:** ✅ **Completado y en producción.**

### 2. Consulta de Rollos Reservados y Liberación entre Agentes ATC
- **Solicitud:** Mostrar siempre una pestaña con los rollos reservados al consultar una tela, visualizar con el cursor (tooltip) qué agente de ATC lo tiene apartado y permitir que el mismo agente de ATC lo libere tras consultarlo con su compañero sin depender de Alma.
- **Resolución:** Se agregó la pestaña de **Reservados** en el cotizador y en Disponibilidad con tooltip informativo (agente responsable, cliente, pedido y antigüedad) y botón de liberación inmediata para el perfil ATC.
- **Estatus:** ✅ **Completado y en producción.**

### 3. Carga de Pantallazo de Pago desde ATC hacia Cobranza
- **Solicitud:** Permitir que las agentes de ATC suban el screenshot/pantallazo de pago (recibido por WhatsApp) al pasar la cotización a validación de Cobranza, para que César lo visualice y únicamente valide el ingreso en banco.
- **Resolución:** Se habilitó el cargador de comprobante fotográfico en ATC al enviar el pedido a `EN_REVISION_COBRANZA`, quedando visible en la consola de Cobranza de César para su aprobación bancaria.
- **Estatus:** ✅ **Completado y en producción.**

### 4. Módulo "¿Quién atiende a este cliente?" (`/clientes`)
- **Solicitud:** Contar con un directorio rápido con buscador en vivo para que, cuando un cliente llame por teléfono, ATC y Alma identifiquen de inmediato quién lo atiende (Agente de Ventas y ATC), junto con su teléfono, correo y dirección.
- **Resolución:** Se creó el módulo **Consulta de Clientes (`/clientes`)** con filtrado instantáneo al escribir, mostrando ejecutivo asignado, datos de contacto y consulta de adeudos en modo lectura.
- **Estatus:** ✅ **Completado y en producción.**

### 5. Perfiles de Agentes de Ventas Externos (`VENDEDOR`) y Gerente de Ventas (`GERENTE_VENTAS`)
- **Solicitud:** Crear accesos para los Agentes de Ventas externos y su Gerente de Ventas. El vendedor solo debe consultar el estatus de **sus propios pedidos** (no los de otros vendedores), revisar adeudos de sus clientes y ver sus **Comisiones** (quitando Comisiones de ATC y ocultando *Disponibilidad* y *En Tránsito* al vendedor).
- **Resolución:** Se configuraron los roles `VENDEDOR` y `GERENTE_VENTAS` con aislamiento estricto por cartera de vendedor, acceso exclusivo al módulo de Comisiones y restricción de módulos operativos de almacén/tránsito.
- **Estatus:** ✅ **Completado y en producción.**

### 6. Candado de Embarque por Escaneo en Handheld antes de Subir a Camioneta
- **Solicitud:** Agregar un candado en el embarque donde el operador escanee el pedido con el Handheld antes de subirlo a la camioneta y el sistema le indique en un Pop-up (`SÍ` / `NO`) si está listo para embarque y si corresponde a la fecha de envío de **HOY** y a la ruta correcta, evitando enviar pedidos antes de tiempo o al destino equivocado.
- **Resolución:** Se implementó el escáner con **Pop-up de validación (`✅ SÍ SUBIR` / `⛔ NO SUBIR`)** en Handheld (`/zebra/envio`) y Rampa (`/envio`), bloqueando automáticamente pedidos no facturados, programados para fechas futuras o de otra ruta.
- **Estatus:** ✅ **Completado y en producción.**

### 7. Requisiciones a Telares y Monitor de Backorders en Perfil de Jefe de Almacén (Formato PDF Orden de Compra)
- **Solicitud:** Mover la solicitud de requisiciones a Telares del perfil de Elba (Directora de Importaciones) al perfil de **Jefe de Almacén (Israel)**, integrando el monitoreo de pedidos en Backorder y generando el documento PDF con formato de **Orden de Compra (`STO` hacia `TELARES Y TEJIDOS`)** para enviarlo por correo a la encargada de Telares.
- **Resolución:** Se habilitó el módulo **Requisiciones a Telares (`/requisiciones`)** exclusivo para el Jefe de Almacén con Monitor de Backorders vs. Stock Local, generador de **Orden de Compra PDF (formato oficial `STO` / `TELARES Y TEJIDOS` RFC `TTE140429HZ6`)** y envío por correo a la encargada de Telares, dejando el módulo de Elba dedicado exclusivamente a Importaciones de China.
- **Estatus:** ✅ **Completado y en producción.**

---

Quedamos atentos a su confirmación de conformidad sobre estos puntos.

Atentamente,

**Jonathan Palacios & Ricardo Zerpa**  
Movida TCI — Equipo de Ingeniería WMS 360+
