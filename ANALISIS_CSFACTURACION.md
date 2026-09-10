# Análisis de CSFacturación y Viabilidad de Integración con WMS Formatex

## ¿Qué es CSFacturación?
CSFacturación es una plataforma mexicana (PAC) enfocada en soluciones para automatización contable y fiscal. A diferencia de un ERP completo como CONTPAQi, CSFacturación se centra en proveer un **hub completo de APIs REST** para que sistemas de terceros (como nuestro WMS) puedan emitir, descargar y validar facturas electrónicas (CFDI 4.0).

---

## 1. ¿Qué ofrece su API?
Su ecosistema de desarrollo cubre todas las necesidades fiscales del SAT a través de peticiones HTTP simples:

*   **CSPlug (Emisión Masiva):** Es su API principal para desarrollo. Le envías un JSON con los datos de la compra/venta y la API te devuelve el XML timbrado, el PDF y el código QR.
*   **CSTimbre:** Si el WMS llegara a generar su propio XML (actualmente no lo hacemos), este servicio solo lo sella ante el SAT.
*   **Descarga Masiva / CSReporter:** Permite conectar con el SAT vía web service (usando e.firma) para descargar hasta 200,000 facturas emitidas o recibidas.
*   **Buzón Tributario y Validación:** APIs para consultar la Constancia de Situación Fiscal (CSF), la Opinión de Cumplimiento (32-D) y validar si un proveedor está en la lista negra del SAT (EFOS).

---

## 2. Precios
CSFacturación **no publica listas de precios fijas y abiertas** en su sitio web porque trabajan bajo un esquema corporativo a la medida. 

*   **Esquema de cobro:** Depende del volumen mensual de timbrado (cantidad de facturas a generar) y los módulos que decidas activar (solo emisión vs. emisión + descarga masiva).
*   **Pruebas Gratuitas:** Ofrecen un entorno "Sandbox" de pruebas y un periodo inicial gratuito para validar la integración antes de pagar.
*   **Cómo cotizar:** Es necesario contactarlos directamente (ventas@csfacturacion.com o teléfono) indicando el estimado de facturas que el WMS Formatex generaría al mes para que un asesor asigne un paquete específico.

---

## 3. ¿Se integra con nuestro WMS (Formatex v2)?
**Sí, y de manera nativa, mucho más fácil que con CONTPAQi Comercial Premium.**

El stack tecnológico de nuestro WMS (Backend en NestJS / Node.js) está diseñado exactamente para consumir APIs REST como las de CSFacturación.

### ¿Por qué es la opción ideal a nivel técnico?

> [!TIP]
> **Integración Directa (REST + JSON):**
> No necesitas middlewares costosos ni servidores Windows (como los requiere CONTPAQi Desktop). Desde NestJS en Render, se usan funciones nativas (`axios` o `fetch`) para mandar el JSON a CSFacturación y recibir la factura al instante.

> [!IMPORTANT]
> **Esquema de Datos Listo:**
> Según el plan de base de datos, ya tenemos contemplados los campos de "CFDI 4.0 invoicing fields". Pasar esta data a la API de CSFacturación es un proceso estándar.

> [!NOTE]
> **Convivencia con Facturapi (Multi-proveedor):**
> Dado que Facturapi ya está integrado en la app, agregar CSFacturación como una segunda opción es un proceso natural. Al actuar en el mismo nivel técnico (APIs REST), podemos abstraer el servicio en NestJS para que el WMS pueda alternar entre Facturapi o CSFacturación según se requiera, brindando mayor flexibilidad tecnológica.

### CSFacturación vs. CONTPAQi (Para el WMS)

| Característica | CSFacturación | CONTPAQi Comercial Desktop |
| :--- | :--- | :--- |
| **Tipo de Sistema** | API REST (Cloud) | Software Desktop (Windows) |
| **Complejidad de Integración en NestJS** | **Baja** (Peticiones HTTP directas) | **Alta** (Requiere API wrapper de AR Software o .NET) |
| **Costos de Infraestructura** | **$0 extras** (Todo ocurre en la nube) | Se requiere pagar Server Windows local/Azure + Licencia |
| **Enfoque del producto** | 100% Facturación y conexión SAT | ERP integral (Compras, Inventario, Bancos) |

## Conclusión y Siguientes Pasos
Si el objetivo del WMS es **únicamente facturar (timbrar CFDI)** y no depender de un ERP contable local que centralice los inventarios, **CSFacturación es una opción moderna, segura y de bajo costo de infraestructura** para el desarrollo.

**Siguientes pasos recomendados:**
1. Crear una cuenta gratuita en su plataforma para acceder a la documentación técnica.
2. Solicitar una cotización a su equipo de ventas dando el volumen estimado de timbrado de Formatex.
3. Si los costos convencen, se puede implementar un módulo en NestJS (`csfacturacion-sync`) para que funcione como una opción alternativa a Facturapi desde la configuración del WMS.
