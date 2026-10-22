# Correo Electrónico Formal — Minuta y Reglas de Negocio ATC & Ventas Formatex

**Para:** alma@formatex.com.mx, andrea.ramirez@formatex.com.mx  
**CC:** rzerpa@movidatci.com, jpalacios@movidatci.com, santiago@formatex.com.mx, ricardo.perez@formatex.com.mx, israel@formatex.com.mx, carla@formatex.com.mx  
**Asunto:** Minuta de Acuerdos y Especificación de Reglas de Negocio v1.1 Consolidada — Módulo de Atención al Cliente (ATC), Ventas & Conexión Logística WMS 360° Formatex  
**Adjunto:** `REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx`

---

Estimadas Alma y Andrea,  
Estimados Don Ricardo Pérez, Santiago, Israel y Carla,

Es un gusto saludarlos. Queremos agradecerles la excelente disposición, el tiempo y la exhaustiva claridad operativa que nos brindaron tanto en nuestra sesión inicial del 14 de octubre como en la sesión de consolidación del pasado miércoles 21 de octubre. Asimismo, agradecemos profundamente el envío del catálogo oficial de precios y de la matriz de precios especiales de Dirección General, los cuales ya fueron procesados e integrados con éxito en la base de datos del sistema.

Con el objetivo de respaldar formalmente estos acuerdos por escrito y asegurar que el desarrollo del **WMS 360+ Formatex** responda con exactitud matemática y operativa a las necesidades cotidianas del equipo de Atención al Cliente y Ventas, les compartimos el documento adjunto: **`REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx` (Versión 1.1 Consolidada)**.

Este documento formaliza las **13 reglas de negocio y candados de seguridad operativa**, constituyendo el marco técnico y vinculante para la entrega, prueba y posterior firma de conformidad.

---

### Resumen Ejecutivo de las 13 Reglas de Negocio Consolidadas:

1. **Registro y Expediente Digital Integral (Multi-Domicilios de Entrega):**
   - ATC es el único canal facultado para dar de alta formal a clientes, validando Constancia de Situación Fiscal (CSF) ante el SAT, contactos directos y Carta de Fletera Oficial con ratificación de póliza de seguro de viaje.
   - El WMS soporta múltiples domicilios por cliente (ej. Bodega Zapopan, Taller Tapicería Punto Sur), identificando para cada uno: receptor autorizado, teléfono celular directo y ventana horaria de recepción.

2. **Las 10 Listas de Precios Oficiales con Candados Gerenciales:**
   - Adopción estricta del catálogo oficial: *F1 Casa Decoradora, F2 Tienda Especial, F3 Fabricante, F4 Distribuidor, F5 Distribuidor Especial, F6 Medio Mayorista, F7 Gran Mayorista, F8 Comprador de Rollo, F9 Mega Mayorista y F10 Venta Web*.
   - **Candados Gerenciales:** Las listas preferenciales (*F3, F5, F7 y F9*) exigen autorización formal de Supervisión/Gerencia (Alma o Dirección) para ser asignadas, con registro inmutable de auditoría.

3. **Confidencialidad de Márgenes y Comisiones:**
   - En las interfaces operativas de ATC y agentes de ventas, quedan totalmente ocultos los costos internos, utilidades y porcentajes de comisión de vendedores (ej. 2.25%).
   - El personal operativo visualiza únicamente el precio final unitario por metro ($/m) autorizado.

4. **Matriz Centralizada de Precios Especiales por Cliente + SKU:**
   - Se eliminan las consultas manuales en hojas de Excel y el riesgo de notas de crédito involuntarias (ej. clientes de proyectos como Muebles Plasencia).
   - El WMS precarga los 306 convenios directivos; al seleccionar cliente y tela, inyecta el precio especial y bloquea el campo para evitar errores tipográficos.

5. **Políticas de Apartado y Regla de la Doble Ventana (24h vs. 72h):**
   - Se oficializa el término **"Apartado"** (descartando 'reserva blanda').
   - **Doble Ventana:** *24 horas comerciales* hacia el cliente en la cotización para impulsar el pago, y *72 horas operativas (3 días hábiles)* en almacén para resguardar la tela conforme a los ciclos corporativos de tesorería (pagos en viernes).

6. **Logística de Entrega y Tarea Preventiva en Surtido (`EN_SURTIDO`):**
   - Al pasar un pedido al estado `EN_SURTIDO` en almacén, el WMS detona una tarea automática para que ATC confirme con el cliente: domicilio exacto, receptor, teléfono, horario y fletera antes de embalar los bultos, evitando costosos desarmes de tarimas terminadas.

7. **Motor de Backorder, Tránsito Marítimo y Cola FIFO con Semáforos:**
   - Asignación de rollos en tránsito marítimo con número de contenedor y fecha estimada de arribo (ETA).
   - Tres modalidades de cobro: *Contado con anticipo*, *Contado al arribo (cierre fiscal)* y *Crédito comercial*.
   - **Semáforos Preventivos:** Alerta a 15 días (revalidar OC) y a 5 días (preparar liquidación y patio de corte). Ante cualquier cancelación, la cola FIFO recorre automáticamente las posiciones (`Turno - 1`).

8. **Matriz de Días y Horarios de Entrega por Cliente & Retención en Bodega:**
   - Configuración en cada cliente de los días autorizados de recepción (`[Lun] [Mar] [Mié] [Jue] [Vie] [Sáb]`) y horarios específicos.
   - **Candado Físico:** Si un pedido está cortado y facturado pero no coincide con los días de recepción del cliente, el sistema **prohíbe cargarlo a la camioneta** y lo mantiene en resguardo visual como `Bodega en Espera de Ruta`, evitando fletes falsos y rechazos en rampa.

9. **Flota Propia de Formatex (8 Camionetas) y Rutas Programadas (Drive In):**
   - Coordinación logística de las 8 unidades vehiculares con Carla (Embarques) vía Drive In.
   - **Ruta Ocotlán (Martes y Jueves):** Rutas foráneas fijas con corte de surtido estricto; si un pedido concluye el lunes tarde, se programa forzosamente para el jueves, guiando a ATC para no prometer fechas incompatibles.

10. **Canal E-Commerce Web (Shopify / Nayeli / Lista F10):**
    - Venta minorista en una sola exhibición sin crédito, liquidada bajo lista oficial `F10`.
    - Guías prepagadas de paquetería para envíos nacionales, y cotización directa de flete exterior con Luis Javier para envíos internacionales excepcionales (ej. Colombia).

11. **Tratamiento de Muestras y Libros como Producto Terminado por Pieza (PZA):**
    - Muestrarios y catálogos se manejan bajo la unidad de medida `PZA` (Pieza), sin metraje lineal, sin cálculo de corte ni generación de retales o mermas.

12. **Traspasos Inter-Compañía Digitales Telares y Tejidos (TNT) ↔ Formatex:**
    - Sustitución de los mensajes y capturas informales de WhatsApp por el nuevo submódulo de **Requisiciones Inter-Compañía** con folios formales, bitácora de auditoría y recepción escaneada con Handheld TC22.

13. **Bloqueo Estricto de Precios Especiales y Listas Asignadas en Captura:**
    - Se prohíbe la modificación manual o tecleo discrecional del precio unitario por parte de los agentes al capturar pedidos, garantizando la integridad de los márgenes comerciales de la empresa.

---

### Estatus de Información Recibida:
- ✅ **10 Listas de Precios Oficiales:** 12,386 combinaciones de precios SKU/Lista ingeridas y validadas en el sistema.
- ✅ **Precios Especiales Directivos:** 306 convenios cliente/SKU precargados en la matriz comercial.
- ✅ **Backorders y Tránsitos Marítimos:** Contenedores reales y colas de espera enlazados.

---

### Siguientes Pasos y Validación:

Les invitamos a revisar el archivo Word adjunto (**`REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx`**). Si desean agregar alguna puntualización o ajuste menor, con gusto lo incorporamos para dejar listo el documento final para la sesión de formalización y firma.

Agradecemos nuevamente su colaboración y compromiso.

Atentamente,

**Jonathan Palacios & Ricardo Zerpa**  
Movida TCI LLC — Transformación Digital & Ingeniería WMS  
Para Forma Textil S. de R.L. de C.V. (Formatex)
