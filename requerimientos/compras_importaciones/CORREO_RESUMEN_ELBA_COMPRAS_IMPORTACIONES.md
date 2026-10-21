# Correo Electrónico Formal — Minuta y Reglas de Negocio Compras e Importaciones Formatex

**Para:** elba@formatex.com.mx, andrea.ramirez@formatex.com.mx  
**CC:** rzerpa@movidatci.com, jpalacios@movidatci.com, santiago@formatex.com.mx, mane@formatex.com.mx  
**Asunto:** Minuta de Acuerdos y Especificación de Reglas de Negocio — Módulo de Compras Internacionales, Importaciones & Telares WMS 360° Formatex  
**Adjunto:** `REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx`

---

Estimadas Elba, Mane y Andrea,

Es un gusto saludarlas. Antes que nada, queremos agradecerles el tiempo, la disposición y el detalle operativo que nos compartieron en nuestra sesión de trabajo del pasado viernes 16 de octubre.

Con el firme propósito de garantizar que el nuevo sistema **WMS 360+ Formatex** responda con absoluta exactitud al flujo real de la cadena de suministro internacional (China) y a la interacción cotidiana entre **Telares y Tejidos** y **Formatex**, hemos preparado el documento técnico adjunto: **`REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx`**.

Este documento recopila y formaliza de manera estructurada los requerimientos, fórmulas de costeo, homologaciones de catálogo y candados operativos que analizamos en la reunión. Su objetivo es constituir una **base técnica y operativa vinculante** que estaremos revisando en conjunto y posteriormente firmando, asegurando un marco transparente de entendimiento y validación.

---

### Resumen Ejecutivo de los Acuerdos y Reglas de Negocio Levantados:

1. **Arquitectura Inter-Compañía (Telares y Tejidos ↔ Formatex):**
   - **Telares y Tejidos (TNT):** Razón social compradora e importadora oficial. Gestiona proveedores en el extranjero (China) y nacionales, contratos de flete marítimo, seguros, maniobras y liquidación de pedimentos aduanales en puerto (Manzanillo). Su bodega (Bodega Rensselaer) custodia el inventario masivo en rollos.
   - **Formatex:** Empresa comercializadora. Al contar con capacidad física limitada para albergar contenedores completos (600 a 900 rollos), opera con abastecimiento continuo bajo demanda diaria.
   - **Módulo Administrativo Integrado en WMS:** Sin necesidad de construir dos sistemas aislados, el WMS integrará la gestión de órdenes de compra, proveedores internacionales y costeo de Telares con visibilidad directa e inmediata para Formatex.

2. **Ciclo de Compras a China y Frecuencia de Órdenes:**
   - **Frecuencia:** Se genera **una (1) orden de compra semanal a China**, detonada formalmente a partir de la directiva y corrida semanal de resurtido de Dirección (Ricardo).
   - **Tiempos de Fabricación y Tránsito:** La producción en origen toma entre **4 y 8 semanas** según el proveedor, seguido de la travesía marítima hacia Manzanillo.
   - **Trazabilidad en Sistema:** Se sustituyen las notas y hojas de cálculo manuales por órdenes de compra registradas con estatus claros: *Borrador, Enviada al Proveedor, En Producción, Zarpado en Tránsito (con # de contenedor y ETA), En Aduana/Puerto y Recibido en Bodega*.

3. **Homologación de Catálogo (Nombre Chino vs. Nombre Comercial):**
   - Para resolver la confusión actual de llevar equivalencias de memoria o en archivos dispersos, la ficha técnica del producto en WMS (`Sku`) incluirá obligatoriamente los campos de **Código/Nombre Chino** del proveedor original y su **Nombre Comercial** oficial para venta en México (ej. *XY-9082 Poly Twill* $\rightarrow$ *Lino Provenza Crudo*).
   - **Catálogo Compartido:** El catálogo de telas es único e idéntico para Telares y Formatex; no cambian nombres ni especificaciones, únicamente varían las existencias por almacén y los costos contables.

4. **Doble Costeo, Divisas y Trazabilidad de Tipo de Cambio por Pedimento:**
   - **Doble Dimensión de Costo:** Cada tela registrará su costo en origen en Dólares Americanos (`costoOrigenUSD` en $/m) y su costo final puesto en bodega mexicana (`costoPuestoMexicoMXN` / Landed Cost), que integra flete marítimo, seguro, maniobras e impuestos aduanales (aranceles/DTA).
   - **Regla del Tipo de Cambio Histórico:** Para evitar distorsiones financieras, **queda prohibido utilizar tipos de cambio actuales o flotantes en consultas de compras pasadas**. El costo en pesos queda respaldado permanentemente por el **Tipo de Cambio Oficial del Pedimento liquidado en la fecha de despacho aduanal**, vinculando número de pedimento, fecha de pago y aduana de entrada.

5. **Flujo de Reposición Inter-Bodegas (Telares → Formatex):**
   - **Frecuencia:** Se efectúan entre **5 y 6 pedidos semanales de Formatex a Telares**.
   - **Consolidado Matutino Diario:** Al inicio del día se genera una orden que concentra las telas requeridas para los pedidos de clientes del día anterior, trasladándose los rollos en el transcurso de la misma jornada.
   - **Traspasos Exprés Vespertinos:** El sistema permitirá tramitar órdenes urgentes desde **un (1) rollo individual** para pedidos críticos de la tarde.
   - **Coordinación Operativa:** El movimiento físico de carga, transporte y recepción entre Rensselaer y Formatex continuará bajo la coordinación operativa de Israel (Almacén).

6. **Facturación Inter-Compañía y Regla de Protección de Margen:**
   - Telares factura a Formatex sumando un margen pactado (entre el **7% y el 12%**) sobre el costo de importación puesto en México.
   - **Regla del Costo Más Alto ante Múltiples Embarques:** Si en bodega coinciden rollos de una misma tela ingresados en diferentes contenedores o fechas con costos de flete variables, el sistema tomará **el costo del último embarque más alto recibido**, protegiendo la utilidad de la empresa ante cualquier incremento logístico.
   - Se presentará un reporte de utilidad previo al timbrado para revalidar el margen antes de emitir la factura.

7. **Integración con Atención al Cliente (ATC) y Disponibilidad Neta:**
   - En las consultas de ATC, el sistema desglosará con claridad: *Existencia física en Formatex*, *Existencia en Telares (disponible en 24h)* y *Mercancía en Tránsito Marítimo (con contenedor y fecha estimada de llegada)*.
   - **Regla de Disponibilidad Neta:** El sistema descontará automáticamente los rollos comprometidos en *Apartados activos (72h)* o en *Backorders FIFO* de otros clientes para nunca sobre-prometer inventario ya apartado.

8. **Trazabilidad en Recepción:**
   - Todo rollo que ingrese al almacén quedará asociado obligatoriamente a su **Lote de Origen**, su **Proveedor (Chino o Nacional)**, su **Contenedor/Pedimento** y su **Clasificación de Calidad** (Conforme, Segunda o Saldo).

---

### Próximos Pasos y Entregables Solicitados de su Lado:

Para alimentar las pruebas del módulo y afinar la parametrización de costos en el sistema, les solicitamos de la manera más atenta que puedan subir a la carpeta compartida entre lunes y martes:
1. Una muestra o copia de su archivo actual de **cálculo de costos de importación** (con las columnas de gastos incrementables, tipo de cambio y fórmulas de costeo puesto en México). Con 2 o 3 líneas de ejemplo es suficiente.
2. Un ejemplo del formato de **Orden de Compra a China** y de la orden de traspaso/facturación de **Telares a Formatex**.
3. El archivo o catálogo donde tienen concentrada la relación de **códigos/nombres de China vs. nombres comerciales en México**.
4. Un par de capturas de pantalla de cómo visualizan actualmente estos conceptos en **CONTPAQi Comercial**.

Les pedimos revisar el documento Word adjunto (**`REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx`**). Si detectan cualquier detalle, matiz o ajuste, con toda confianza indíquenlo sobre el archivo para afinarlo antes de nuestra sesión de formalización.

Quedamos a su entera disposición y les enviamos un cordial saludo.

Atentamente,

**Jonathan Palacios & Ricardo Zerpa**  
Movida TCI LLC — Transformación Digital & Ingeniería WMS  
Para Forma Textil S. de R.L. de C.V. & Telares y Tejidos S.A. de C.V.
