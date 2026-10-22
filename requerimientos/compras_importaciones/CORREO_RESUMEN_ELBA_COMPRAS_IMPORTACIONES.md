# Correo Electrónico Formal — Minuta y Reglas de Negocio Compras e Importaciones Formatex

**Para:** elba@formatex.com.mx, mane@formatex.com.mx  
**CC:** andrea.ramirez@formatex.com.mx, israel@formatex.com.mx, ricardo.perez@formatex.com.mx, santiago@formatex.com.mx, rzerpa@movidatci.com, jpalacios@movidatci.com  
**Asunto:** Minuta de Acuerdos y Especificación de Reglas de Negocio v1.2 — Módulo de Compras Internacionales (China), Costeo de Importación & Requisiciones Telares ↔ Formatex WMS 360°  
**Adjunto:** `REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx`

---

Estimadas Elba y Mane,  
Estimados Don Ricardo Pérez, Andrea, Israel y Santiago,

Es un verdadero gusto saludarlos. Por medio del presente, queremos agradecerles de manera muy especial el tiempo, la apertura y toda la valiosa información operativa que nos compartieron tanto en nuestra sesión de trabajo como en el paquete documental que Elba nos hizo llegar puntualmente (fórmulas de costeo en Excel, pedimento oficial de importación SAT, órdenes de compra en China, vales de carga y capturas contables de CONTPAQi).

Con el objetivo de respaldar formalmente estos acuerdos e integrarlos con absoluta fidelidad en el nuevo sistema **WMS 360+ Formatex**, hemos preparado y consolidado el documento técnico y operativo adjunto: **`REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx` (Versión 1.2)**.

Este documento formaliza cada criterio técnico, fórmula matemática de costeo, homologación de catálogos y candados de seguridad inter-compañía, constituyendo la **base vinculante de desarrollo y control de cambios** para el módulo de Compras e Importaciones.

---

### Resumen Ejecutivo de las Reglas de Negocio y Acuerdos Consolidados:

1. **Arquitectura Inter-Compañía y "Las Dos Camisas de Elba":**
   - **Telares y Tejidos S.A. de C.V. (Importadora / Bodega Río Tototlán `BOD-TNT`):** Razón social oficial ante el SAT. Realiza compras de contenedores FCL en USD a molinos en China y gestiona fletes marítimos, seguros y pedimentos aduanales en Manzanillo. Su bodega opera como hub paletizado de bultos cerrados de 50m. *En Telares no existe mesa de corte ni servicio de retazos.*
   - **Forma Textil S. de R.L. de C.V. (Comercializadora / Bodega Zapopan `BOD-PRI`):** Espacio físico acotado; se abastece de forma fraccionada y continua bajo demanda diaria (rollos de 50m) desde Telares. Aquí se ubica la mesa de corte, retazos, mermas y atención directa a clientes con las 10 listas de precios.
   - **El Rol Dual de Elba:** El WMS integra un conmutador corporativo en `/compras` que permite a Elba operar con su *Camisa Telares* (gestión de compras internacionales en USD y costeo aduanal) o con su *Camisa Formatex* (emisión de requisiciones de resurtido diario hacia Tototlán).

2. **Ciclo de Compras Internacionales a China:**
   - **Frecuencia:** Se genera **una (1) orden semanal a China**, detonada a partir de la corrida del Master de Resurtido ($S+P+T$ vs $4M \times 4.5$) de Dirección General (Don Ricardo Pérez).
   - **Tiempos de Fabricación y Tránsito:** Fabricación en China de 4 a 8 semanas, seguida de travesía marítima con arribo habitual al Puerto de Manzanillo (contenedores de 600 a 900 rollos).
   - **Trazabilidad Sistémica:** Se sustituyen controles manuales por un flujo digital de 6 estados: *Borrador ➔ Confirmada ➔ Enviada Proveedor ➔ En Tránsito (con # de contenedor y ETA) ➔ En Recepción ➔ Completada*.

3. **Homologación de Catálogo (Código Chino vs. Nombre Comercial):**
   - La ficha del SKU en el WMS homologa de forma obligatoria el **Código/Nombre Chino del proveedor** (ej. *XY-9082 Poly Twill*) y su **Nombre Comercial en México** (ej. *Lino Provenza Crudo*).
   - **Catálogo Compartido:** El maestro de telas es único e idéntico para Telares y Formatex; comparten códigos, anchos y composiciones, diferenciándose únicamente en las existencias por bodega y el costeo contable.

4. **Doble Costeo, Fórmulas Landed y Regla del Tipo de Cambio Histórico:**
   - **Doble Dimensión de Costo:** Cada tela registra su costo en origen en USD (`costoOrigenUSD`) y su costo final puesto en bodega mexicana en MXN (`costoPuestoMexicoMXN` / Landed Cost).
   - **Fórmula de Costeo Landed Oficial de Elba:**
     $$\text{Costo Landed} = (\text{Precio FOB USD} \times \text{TC Oficial Pedimento SAT} \times 1.23) + \frac{\text{Flete Marítimo y Seguro}}{\text{Metros Totales Contenedor}}$$
   - **Regla Crítica del Tipo de Cambio Histórico:** Queda estrictamente prohibido recalcular el costo histórico de compras anteriores usando tipos de cambio flotantes actuales. Todo costeo en pesos queda anclado permanentemente al **Tipo de Cambio Oficial del Pedimento pagado ante el SAT** (ej. $18.3688 MXN/USD según pedimento oficial), vinculando número de pedimento, fecha de pago y aduana de despacho.

5. **Reposición Inter-Bodegas Digitalizada (Telares ➔ Formatex):**
   - **Frecuencia:** Entre 5 y 6 pedidos semanales de Formatex a Telares (consolidado matutino diario y traspasos exprés vespertinos desde 1 rollo).
   - **Regla Operativa:** Telares **únicamente despacha rollos enteros de 50 metros**.
   - **Eliminación del WhatsApp:** El WMS reemplaza las fotos y mensajes informales con un submódulo de **Requisiciones Inter-Compañía**, que incluye:
     1. Generación de folio oficial (ej. `REQ-TNT-2026-0001`).
     2. Botón *"Copiar p/ WhatsApp"* para notificar al grupo de bodega con formato limpio.
     3. Impresión de **Vale de Carga Oficial** para el chofer con firmas de entrega y recepción.
     4. Semáforo de 3 estados: *Solicitada ➔ En Ruta Camioneta ➔ Recibida en Zapopan*.

6. **Facturación Inter-Compañía y Regla de Protección de Margen:**
   - Telares factura a Formatex con un margen pactado del 7% al 12% sobre el costo puesto en México, o mediante el factor formal **FM = 0.88**.
   - **Regla del Costo Más Alto:** Ante la coexistencia de rollos de una misma tela ingresados en diferentes contenedores con fletes variables, el sistema toma como base de transferencia **el costo del último embarque más alto recibido**, protegiendo la rentabilidad del grupo.

7. **Disponibilidad Unificada 360° para Atención al Cliente (ATC):**
   - El personal de ATC y Ventas consulta de forma transparente: *Stock Físico Zapopan (entrega inmediata)*, *Stock Telares Tototlán (disponible en 24h)* y *Tránsito Marítimo (con fecha estimada de arribo)*, deduciendo en tiempo real apartados (24h/72h) y backorders FIFO.

8. **Preparación Estratégica para Fase 2 (WMS Slim en Telares y Tejidos):**
   - Conforme a la visión de Don Ricardo Pérez, la arquitectura del WMS queda preparada para desplegarse como segunda fase en Telares: recepción de contenedores completos FCL, tarimas cerradas de alta densidad y despacho ágil hacia Formatex (sin mesas de corte ni venta al menudeo).

---

### Confirmación de Documentos Oficiales Recibidos y Procesados:

Agradecemos la entrega y confirmamos el procesamiento en el sistema de los siguientes documentos:
- ✅ `CALCULO DE COSTOS DE IMPORTACION (COSTEO).xlsx` — Fórmulas de costeo FOB, aranceles e incrementables al 23%.
- ✅ `PEDIMENTO.pdf` — Pedimento SAT oficial de importación A1 con TC 18.3688 en Aduana Manzanillo.
- ✅ `ORDEN DE COMPRA.pdf` & `EXPEDIENTE COMPLETO.pdf` — Formato de compra internacional a proveedor chino en USD.
- ✅ `VALE.pdf` & `ORDEN DE COMPRA FORMATEX A TELARES.pdf` — Formato físico de vale de chofer y traspaso.
- ✅ `MUESTRA DE COMPRAS EN CONTPAQi.pdf` — Capturas de CONTPAQi Comercial y factor FM = 0.88.

---

### Siguientes Pasos y Validación:

Les invitamos a revisar detalladamente el archivo Word adjunto (**`REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx`**). Si tienen cualquier comentario, ajuste o precisión sobre la redacción o las fórmulas, con toda confianza indíquenlo para afinarlo antes de nuestra sesión de formalización y firma de conformidad.

Quedamos a su entera disposición para cualquier duda o consulta.

Un cordial saludo,

**Jonathan Palacios & Ricardo Zerpa**  
Movida TCI LLC — Transformación Digital & Ingeniería WMS  
Para Forma Textil S. de R.L. de C.V. & Telares y Tejidos S.A. de C.V.
