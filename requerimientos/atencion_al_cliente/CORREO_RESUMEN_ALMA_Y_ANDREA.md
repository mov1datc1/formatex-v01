# Correo Electrónico Formal — Minuta y Reglas de Negocio ATC Formatex

**Para:** alma@formatex.com.mx, andrea.ramirez@formatex.com.mx  
**CC:** rzerpa@movidatci.com, jpalacios@movidatci.com, santiago@formatex.com.mx  
**Asunto:** Minuta de Acuerdos y Especificación de Reglas de Negocio — Módulo ATC & Ventas WMS 360° Formatex  
**Adjunto:** `REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx`

---

Estimadas Alma y Andrea,

Es un gusto saludarlas. Antes que nada, queremos agradecerles el tiempo, la apertura y la claridad operativa que nos brindaron en nuestra sesión de trabajo de este miércoles 14 de octubre.

Con el objetivo de garantizar que el nuevo sistema **WMS 360+ Formatex** responda con total fidelidad a la operación real del día a día, y asegurando que cada detalle quede formalmente respaldado por escrito, hemos elaborado el documento adjunto: **`REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx`**. 

Este documento recopila de manera estructurada los requerimientos, políticas y candados de control que levantamos durante la llamada. Su propósito es servir como una **base técnica y operativa vinculante** que estaremos revisando, editando en conjunto y posteriormente firmando ambas partes, de modo que contemos con un marco claro y transparente para la entrega y validación del módulo.

---

### Resumen de los Puntos y Reglas de Negocio Levantados en la Sesión:

1. **Alta y Expediente Digital del Cliente (Multi-Domicilios):**
   - El personal de ATC continuará siendo el encargado de dar de alta formal a los clientes que los agentes envíen.
   - Se integrará el expediente digital con: Constancia de Situación Fiscal (CSF), Carta oficial de selección de fletera y validación de seguro de carga, contactos y teléfonos directos.
   - **Múltiples Destinos de Entrega:** El sistema permitirá registrar múltiples domicilios por cliente (ej. Matriz fiscal, Bodega Zapopan, Taller Tapicería Punto Sur), identificando para cada uno su receptor en sitio, teléfono celular y horario permitido de descarga.
   - **Compras Web / Esporádicas:** Se separan del catálogo mayorista y se canalizan con la Asesora de Servicio a Clientes del área de Marketing, con facturación genérica o individual según lo requiera el comprador.

2. **Las 10 Listas de Precios Oficiales y Candados Gerenciales:**
   - Se homologan las 10 listas reales de Formatex: *F1 Casa Decoradora, F2 Tienda, F3 Tienda Especial, F4 Fabricante, F5 Fabricante Especial, F6 Distribuidor, F7 Distribuidor Especial, F8 Cliente Premium, F9 Precio Dirección / Mayorista, y F10 Venta Web*.
   - Todo cliente tendrá su lista asignada por defecto desde su alta.
   - **Candado de Seguridad:** Si en una cotización particular se requiere aplicar una lista más baja o una lista especial (*F3, F5, F7, F9*), el sistema exigirá una **autorización formal de Supervisión/Gerencia (Alma)** con registro de auditoría (quién aprobó, cuándo y motivo), evitando modificaciones directas no autorizadas.

3. **Confidencialidad de Márgenes y Comisiones:**
   - En las pantallas de cotización de ATC y de los vendedores de calle, **quedan completamente ocultos los porcentajes de comisión (ej. 2.25%) y márgenes internos de utilidad**.
   - El personal operativo únicamente visualizará el precio final unitario por metro ($/m) autorizado. Los costos y márgenes se reservan de forma exclusiva para perfiles directivos.

4. **Matriz Centralizada de Precios Especiales (Cliente + SKU):**
   - Para eliminar la consulta manual en hojas de Excel y erradicar errores de captura o notas de crédito (ej. clientes tapiceros de cadenas como Plasencia), se centralizará una matriz en el sistema.
   - Al seleccionar al cliente y la tela en la cotización, el sistema detectará automáticamente si existe un precio especial pactado por Dirección General y lo aplicará de forma directa y bloqueada.

5. **Políticas de Apartado y Tiempos de Retención (24h vs. 72h):**
   - Se oficializa en todo el sistema el término comercial **"Apartado"** (eliminando el concepto técnico de 'reserva blanda').
   - **Regla de Doble Ventana:**
     - *Hacia el cliente:* Se comunican **24 horas** de apartado en la cotización para forzar prontitud en el pago.
     - *Interno en almacén:* El sistema retendrá y protegerá físicamente los rollos durante **72 horas (3 días)** para adaptarse a los ciclos de tesorería y programación de pagos de empresas corporativas (pagos en viernes). Se eliminan opciones de 7 y 14 días.

6. **Logística de Entrega y Tarea Preventiva en Surtido:**
   - La asesora podrá elegir el destino específico desde que cotiza.
   - **Acuerdo de Validación:** Para evitar retrasos en empaque, en el momento exacto en que almacén pone el pedido **"En Surtido"**, el sistema asignará una tarea a la asesora de ATC creadora (con visibilidad para supervisión) para revalidar con el cliente: destino final exacto, receptor, teléfono móvil, horario de recepción, fletera y seguro antes de embalar los rollos.

7. **Motor de Backorders, Tránsito Marítimo y Cola FIFO:**
   - Identificación de pedidos con tela en contenedor o telar, registrando número de contenedor, fecha de captura y fecha estimada de arribo (ETA).
   - Contemplación de los 3 formatos: *Contado con anticipo* (metraje congelado), *Contado al arribo* (sincronizado con factura en el mes de llegada para cuadre fiscal) y *Crédito comercial*.
   - **Semáforos Preventivos:** Alerta a los **15 días** previos al arribo para que ATC llame al cliente a revalidar la vigencia de la Orden de Compra, y alerta a los **5 días** para confirmación final de pago o cargo a crédito.
   - **Recorrido Automático FIFO:** Si un cliente cancela o reduce metraje, la fila avanza en automático (`Turno - 1`) y la tela liberada se asigna al siguiente cliente en espera.

---

### Próximos Pasos y Entregables Pendientes de su Lado:

Para complementar el expediente técnico y afinar los catálogos en el sistema, quedamos atentos a que nos puedan compartir en cuanto les sea posible:
1. El documento con la descripción detallada de las **10 listas de precios vigentes** y los perfiles de cliente asociados.
2. El archivo de Excel actual donde tienen concentrados los **precios especiales autorizados por Dirección General**.
3. El paquete documental muestra que se entrega a los clientes al darlos de alta (ejemplo de CSF, carta de fleteras y seguro de envío).

Les pedimos revisar el documento Word adjunto (`REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx`). Cualquier comentario, adición o ajuste que consideren necesario, con toda confianza indíquenlo sobre el archivo para afinarlo antes de la sesión de firma.

Quedamos a su entera disposición y les enviamos un cordial saludo.

Atentamente,

**Jonathan Palacios & Ricardo Zerpa**  
Movida TCI LLC — Transformación Digital & Ingeniería WMS  
Para Forma Textil S. de R.L. de C.V. (Formatex)
