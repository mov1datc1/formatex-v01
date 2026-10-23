# Correo Electrónico Formal — Minuta y Reglas de Negocio Almacén, Surtido, Corte & Embarques

**Para:** israel@formatex.com.mx, andrea.ramirez@formatex.com.mx  
**CC:** alma@formatex.com.mx, santiago@formatex.com.mx, ricardo.perez@formatex.com.mx, carla@formatex.com.mx, rzerpa@movidatci.com, jpalacios@movidatci.com  
**Asunto:** Minuta de Acuerdos y Especificación de Reglas de Negocio v1.0 — Módulo de Almacén, Surtido, Corte, Empaque, Embarques y Reabastecimiento a Telares WMS 360° Formatex  
**Adjunto:** `REGLAS_DE_NEGOCIO_ALMACEN_FORMATEX.docx`

---

Estimado Israel, Estimada Andrea,  
Estimados Don Ricardo Pérez, Santiago, Alma y Carla,

Esperamos que se encuentren muy bien. Queremos agradecerles sinceramente la valiosa sesión operativa y entrevista que sostuvimos hoy con **Israel** y **Andrea**, en la cual revisamos a detalle la mecánica diaria del almacén central de Formatex, sus capacidades de producción, los cuellos de botella en corte y empaque, los criterios de embarque y el enlace de suministro con Telares.

Para formalizar y respaldar técnicamente cada uno de los puntos expuestos, les compartimos el documento adjunto: **`REGLAS_DE_NEGOCIO_ALMACEN_FORMATEX.docx` (Versión 1.0 Oficial)**.

Este documento establece las **10 reglas de negocio y parámetros operativos fundamentales** que ya estamos integrando en el código del **WMS 360° Formatex**, garantizando que el sistema refleje fielmente el día a día de la bodega.

---

### Resumen Ejecutivo de las 10 Reglas de Negocio Consolidadas:

1. **Protocolo de Validación de Existencia (< 100 Metros):**
   - Cuando un SKU tiene menos de 100 metros disponibles en sistema o se trata de rollos abiertos, el WMS no permite apartados automáticos a ciegas.
   - Se distinguen dos modalidades:
     - *Consulta de Existencia Rápida:* Almacén revisa etiqueta física en rack y notifica a ATC en 15 a 30 minutos (máximo 1 hora).
     - *Cotización en Firme:* Para clientes listos para pagar, el rollo se baja y se mide físicamente en mesa de medición para garantizar metraje utilizable exacto.

2. **Doble Ventana de Apartado y Marbete Físico (2 Días Cliente vs. 3 Días Almacén):**
   - *Comercial Externa (Cliente):* 2 días hábiles (48 horas) comunicados al cliente para presionar el pago oportuno.
   - *Operativa Interna (Almacén):* 3 días hábiles (72 horas) de resguardo físico en bodega, protegiendo al cliente si liquida la mañana del tercer día.
   - En bodega se imprime y coloca el marbete físico `APARTADO - PROHIBIDA SU VENTA`. Si al tercer día hábil no hay pago, el WMS libera automáticamente el rollo al inventario general y genera alerta para retirar el marbete.

3. **Capacidad de Surtido y Asignación por Altura y Especialidad:**
   - Se homologa la tasa de productividad base: **55 a 60 unidades (cortes o rollos) por surtidor por día**.
   - *Rollos en Racks Altos (Nivel 2 o superior):* Asignación exclusiva a personal con licencia y certificación de **Montacargas**.
   - *Cortes a Nivel de Piso:* Asignables a personal general.
   - *Pedidos Mixtos (Cortes en piso + Rollos en altura):* Asignados íntegramente a un surtidor experto con montacargas, evitando divisiones que dejen cortes varados en espera de rollos altos.

4. **Carritos de Corte de 3 Niveles (A1, A2, A3) y Control de Calidad:**
   - El surtidor registra la ubicación de origen del rack y deposita los rollos en carritos de corte de 3 niveles (`Carrito A1`, `A2`, `A3`).
   - El cortador visualiza en pantalla en qué carrito y nivel exacto se encuentra la tela asignada.
   - *Control de Calidad:* Si en la mesa de corte se detecta tela dañada, mancha o falla de fábrica, se suspende el corte, se registra la incidencia en el WMS y se solicita cambio de rollo del mismo lote. Si no hay más rollos de ese lote, se notifica de inmediato a ATC.

5. **Matriz Oficial de Promesa de Entrega (SLA) y Regla Anti-Trampa:**
   - *Rollo Cerrado (< 10 rollos):* **24 a 48 horas hábiles**.
   - *1 a 4 cortes:* **72 horas hábiles** (3 días).
   - *5 a 9 cortes:* **96 horas hábiles** (4 días).
   - *10 cortes o más:* **96+ horas hábiles** (programado con almacén).
   - *Regla Anti-Trampa:* Si un cliente divide un pedido grande en varios pedidos pequeños el mismo día para exigir 72 horas (ej. dos pedidos de 4 cortes), el WMS los consolida automáticamente y aplica el SLA correspondiente al total de cortes (96 horas hábiles).

6. **Algoritmo de Sugerencia por Lote y Alerta Preventiva de Tono:**
   - El sistema prioriza despachar rollos del **mismo lote de producción/tintada**.
   - Si el stock obliga a combinar lotes diferentes para surtir un pedido, el WMS emite una **Alerta Crítica Bloqueante de Variación de Tono**, requiriendo que ATC consulte al cliente si la tela es para la misma pieza continua (ej. sala modular, donde no se permite mezcla) o para piezas separadas (cojines/sillas), registrando la autorización en sistema.

7. **Las 4 Etiquetas Oficiales de Embarque y Estiba por Niveles:**
   - *Etiqueta 1 (Local):* Nivel Inferior de embarque (reparto ZMG en flota Formatex).
   - *Etiqueta 2 (Foránea):* Nivel Superior de embarque (fleteras pesadas consolidadas).
   - *Etiqueta 3 (Ruta Ocotlán):* Área asignada a la ruta fija de Ocotlán (Martes y Jueves).
   - *Etiqueta 4 (Paqueterías):* Paquetexpress, Travisa, Tres Guerras, etc.
   - *Paquetexpress:* Se captura peso real (kg) y medidas volumétricas (L $\times$ A $\times$ A en cm) en empaque para emisión de pre-guía.

8. **Horarios de Rutas y Paqueterías:**
   - *Ruta Ocotlán:* Salida Martes y Jueves a primera hora (surtido y empaque Lunes y Miércoles previos).
   - *Ruta Arandas:* Salida Miércoles a primera hora (surtido Martes).
   - *Paqueterías Regulares:* Corte operativo a las **14:00 hrs**. Pedidos concluidos después de esa hora se recolectan al siguiente día hábil.

9. **Evidencia Digital de Guías de Fletera (Tracking y Acuse):**
   - Se sustituye el envío de fotos informales por WhatsApp.
   - Choferes y personal de embarque disponen de un módulo en WMS para tomar la fotografía de la guía física sellada por la fletera y capturar el número de guía oficial.
   - Al guardar, el pedido cambia automáticamente a `EN_TRANSITO`, notificando en tiempo real a ATC y enviando al cliente su guía para rastreo directo.

10. **Reabastecimiento a Telares (Meta de 8 Meses de Stock y Cortes 13:00 / 14:00 hrs):**
    - *Meta de Inventario Formatex:* Israel establece una política de **8 meses de inventario** (el doble del parámetro comercial de 4 meses) para proteger a la empresa de contingencias y tiempos de tránsito marítimo.
    - *Requisición Ordinaria:* Corridas periódicas Lunes y Viernes basadas en la proyección de 8 meses.
    - *Pedidos Urgentes ATC:* Corte diario a las **13:00 hrs**; Israel envía la orden consolidada a Telares a las **14:00 hrs** para surtido al día hábil siguiente.
    - *Doble Etiquetado:* Telares etiqueta el contenedor de China; al ingresar a la nave de Formatex, se genera y coloca la etiqueta oficial Formatex con SKU, lote y ubicación asignada.

---

### Próximos Pasos:
1. **Revisión del Documento:** Les solicitamos revisar el archivo adjunto `REGLAS_DE_NEGOCIO_ALMACEN_FORMATEX.docx` y hacernos llegar cualquier observación o confirmación de conformidad.
2. **Implementación en WMS:** Hemos iniciado la incorporación de estos parámetros, pantallas y algoritmos tanto en el backend como en la interfaz de usuario para que estén disponibles en el ambiente de pruebas.
3. **Sesión de Cierre de Circuito (Lunes 13:00 / 14:00 hrs):** Conforme a lo acordado con Andrea, coordinaremos la sesión del lunes con el área administrativa/cobranza (César / Nathalie) para cerrar el ciclo completo de facturación y pagos.

Agradecemos nuevamente su invaluable colaboración y compromiso con este proyecto.

Atentamente,

**Jonathan Palacios** & **Ricardo Zerpa**  
Dirección Técnica & Arquitectura de Procesos  
**Movida TCI LLC**  
*En colaboración con el equipo de Forma Textil S. de R.L. de C.V.*
