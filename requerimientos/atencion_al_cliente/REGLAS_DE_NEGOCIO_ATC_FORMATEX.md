# Formatex WMS 360° — Especificación de Reglas de Negocio
## Módulo de Atención al Cliente (ATC) & Ventas

**Fecha de Levantamiento Original:** Miércoles, 14 de Octubre de 2026  
**Fecha de Revisión y Validación (Sesión #2):** Miércoles, 21 de Octubre de 2026  
**Organización:** Forma Textil S. de R.L. de C.V. (Formatex)  
**Proveedor Tecnológico:** Movida TCI LLC  
**Versión:** 1.1 (Oficial Consolidada con Sesión #2 para Revisión y Firma)  
**Participantes en las Sesiones:**
- **Alma** — Jefatura de Atención al Cliente (Formatex)
- **Andrea Ramírez** — Atención al Cliente & Operaciones (Formatex)
- **Santiago** — Operaciones & Comercial (Formatex)
- **Nayeli** — Atención a Clientes Canal Web / E-Commerce Shopify (Formatex)
- **Ricardo Zerpa** — Arquitectura de Producto & Procesos (Movida TCI)
- **Jonathan Palacios** — Dirección Técnica & Desarrollo WMS (Movida TCI)

---

## 1. Propósito y Marco de Aceptación Vinculante

El presente documento recopila y formaliza de manera transparente y exhaustiva todas las **reglas de negocio, candados de seguridad operativa y flujos de trabajo** consensuados durante las sesiones operativas del 14 y 21 de octubre de 2026 entre el equipo de Atención al Cliente (ATC) de Formatex y Movida TCI.

### Finalidad Operativa y Contractual:
Este documento actúa como **anexo técnico vinculante**. Su propósito es dejar por escrito el alcance, las excepciones y los criterios de aceptación para que ambas partes cuenten con un estándar único y homologado, evitando discrepancias futuras ("no me lo preguntaste" o "yo te lo dije") y garantizando que el WMS 360° responda exactamente a las necesidades operativas de Formatex.

---

## 2. Regla de Negocio 1: Registro y Perfilado Integral de Clientes

### 2.1. Origen y Responsabilidad del Alta
1. Los agentes comerciales foráneos y locales ("callejeros") recopilan y envían la documentación de los prospectos por correo o mensajería.
2. El personal de **Atención al Cliente (ATC)** es el único facultado para registrar el alta formal del cliente en el sistema.

### 2.2. Expediente Digital Obligatorio del Cliente
Para autorizar cotizaciones de mayoreo o líneas de crédito, ATC captura:
- **Razón Social y RFC**, validado contra la Constancia de Situación Fiscal (CSF) emitida por el SAT.
- **Domicilio Fiscal Matriz** (Calle, Número exterior/interior, Colonia, Municipio, Estado, Código Postal).
- **Carta de Selección de Fletera Oficial**, debidamente firmada por el cliente, donde ratifica la empresa de transporte de su preferencia y si contrata o declina el **seguro de carga** ante siniestros en carretera.
- **Datos de Contacto Clave:** Nombre, teléfono celular directo y correo para envío automático de facturas CFDI (compras y tesorería).

### 2.3. Estructura Multi-Domicilio (Destinos Alternos de Entrega)
- En la operación textil de Formatex, un mismo cliente fiscal suele despachar a múltiples destinos físicos (sucursales, bodegas regionales o talleres de tapicería de maquila externa, ej. *Bodega Zapopan*, *Taller Tapicería Punto Sur*).
- El WMS permite registrar **N domicilios de entrega por cliente**, guardando para cada uno:
  - Alias descriptivo de la sucursal o taller.
  - Dirección completa con referencias de descarga.
  - Nombre del encargado o persona autorizada para recibir.
  - Teléfono celular directo del receptor.
  - Horario de recepción permitido (ej. *Lunes a Viernes 08:00 a 14:00 hrs*).

### 2.4. Tratamiento Diferenciado para Clientes Web / Ocasionales
- Los compradores que contactan por la tienda web para compras únicas de menudeo o esporádicas no se mezclan con el catálogo mayorista de ATC, siendo atendidos por la **Asesora de Servicio a Clientes del área de Marketing**.
- Operan con precios de lista web sin requerir alta formal de distribuidor, emitiéndose factura al público en general (RFC genérico) o CFDI individual si el usuario lo solicita.

---

## 3. Regla de Negocio 2: Las 10 Listas de Precios Oficiales y Candados de Modificación

### 3.1. Homologación de las 10 Listas Oficiales Formatex
El WMS descarta cualquier nomenclatura genérica y adopta el catálogo oficial proporcionado por la jefatura de ATC:

| Código | Nombre de la Lista | Perfil Comercial Objetivo | Nivel de Autorización Requerido |
| :---: | :--- | :--- | :--- |
| **F1** | Casa Decoradora | Estudios de interiorismo, diseñadores y decoradores | Asignación Estándar (Sin aprobación) |
| **F2** | Tienda | Locales comerciales de venta de tela y retail | Asignación Estándar (Sin aprobación) |
| **F3** | Tienda Especial | Tiendas con volumen negociado intermedio | **Requiere Autorización Gerencial (Alma)** |
| **F4** | Fabricante | Fabricantes de muebles y tapicería estándar | Asignación Estándar (Sin aprobación) |
| **F5** | Fabricante Especial | Fabricantes de gran escala con volumen preferencial | **Requiere Autorización Gerencial (Alma)** |
| **F6** | Distribuidor | Mayoristas de reventa regional | Asignación Estándar (Sin aprobación) |
| **F7** | Distribuidor Especial | Distribuidores estratégicos de alto volumen | **Requiere Autorización Gerencial (Alma)** |
| **F8** | Cliente Premium | Cuentas institucionales de máxima fidelidad | Asignación Estándar (Al alta) |
| **F9** | Precio Dirección / Mayorista | Negociaciones directas de volumen excepcional | **Requiere Autorización de Dirección / Alma** |
| **F10** | Venta Web / Asesor Externo | Público general y asesores digitales externos | Asignación Estándar Web (Marketing) |

### 3.2. Candado de Modificación de Lista en Cotizaciones
- Todo cliente tiene asignada su lista oficial por defecto al momento del alta.
- Si en una cotización particular un agente acuerda verbalmente otorgar una lista más baja o una lista especial (ej. aplicar `F5` a un cliente con perfil `F1`), el sistema **bloquea el avance del pedido**.
- La cotización se coloca en estado de espera (`REQUIERE_AUTORIZACION`), requiriendo que la Supervisora de ATC (Alma) ingrese al sistema para autorizar la excepción, quedando asentado el usuario autorizador, fecha, hora y justificación comercial.

---

## 4. Regla de Negocio 3: Privacidad y Confidencialidad de Márgenes y Comisiones

1. **Ocultamiento Estricto para Personal Operativo:**
   - En las interfaces del cotizador y pedidos para personal de Atención al Cliente (ATC) y Agentes de Ventas, **queda estrictamente prohibido y oculto el despliegue de porcentajes de comisión** (ej. `2.25%`), utilidades brutas o costos de importación.
2. **Visualización Unificada:**
   - El operador visualiza únicamente el precio final unitario por metro ($/m) pactado para esa línea.
3. **Acceso Restringido:**
   - El desglose financiero de costos, márgenes y comisiones liquidadas a vendedores es accesible única y exclusivamente para los roles `ADMIN` y `GERENCIA`.

---

## 5. Regla de Negocio 4: Matriz Centralizada de Precios Especiales por Cliente + Tela

### 5.1. Diagnóstico del Proceso Actual (Hojas de Excel Paralelas)
- Dirección General pacta con frecuencia precios especiales para proyectos corporativos (ejemplo: telas que entran a piso de exhibición de cadenas muebleras como *Muebles Plasencia*, cuya compra se ejecuta a través de una red de tapiceros terceros).
- Actualmente, estos precios se registran en una hoja de Excel que las asesoras deben consultar de memoria. Cuando una asesora olvida revisar el archivo o comete un error tipográfico, se genera una disputa comercial y la consecuente emisión de **Notas de Crédito** que afectan la cobranza.

### 5.2. Solución Sistémica en WMS 360°
- Se centraliza la entidad `ClientSpecialPrice` en la base de datos oficial.
- Cada precio especial se vincula a la dupla `Cliente + SKU`, con su precio neto por metro ($/m), referencia del proyecto (ej. *Plasencia*) y vigencia temporal.
- **Auto-Detección y Bloqueo:** Al seleccionar al cliente y agregar la tela en la cotización, el WMS consulta automáticamente la matriz. Si existe un precio pactado vigente, lo inyecta automáticamente, bloquea el campo de precio para evitar errores de dedo y coloca un distintivo de *Precio Especial Autorizado por Dirección*.

---

## 6. Regla de Negocio 5: Políticas de Apartado y Retención de Inventario (24h vs. 72h)

### 6.1. Oficialización del Término "Apartado"
Se descarta formalmente el término técnico de "Reserva Blanda" y se oficializa en todo el sistema como **"Apartado"**.

### 6.2. La Regla de la Doble Ventana de Tiempo
- **Ventana Comercial Externa (24 Horas):** Al cliente se le notifica por cotización y por mensaje que el apartado de rollos tiene una vigencia de 24 horas, ejerciendo presión comercial para acelerar el depósito bancario.
- **Ventana Operativa Interna (72 Horas / 3 Días):** En almacén, el WMS retiene y protege físicamente los rollos apartados durante 72 horas (3 días hábiles). Esto obedece a que los clientes corporativos procesan sus pagos mediante ciclos semanales fijos (pagos en viernes) y requieren un margen operativo razonable antes de liberar la tela al inventario general.
- Se eliminan del sistema las opciones anteriores de 7 días (168h) y 14 días (336h).

---

## 7. Regla de Negocio 6: Logística de Entrega y Tarea de Validación Preventiva

### 7.1. Captura de Destino en Cotización
Al cotizar, la asesora puede elegir el domicilio fiscal o cualquiera de los destinos de entrega registrados del cliente.

### 7.2. Tarea Obligatoria en Fase de Surtido (`EN_SURTIDO`)
- Debido a que entre la cotización y la preparación física del pedido pueden transcurrir varios días, el cliente con frecuencia cambia de taller receptor o designa un nuevo chofer.
- **Acuerdo Operativo:** La validación final **no debe esperar a que el pedido esté empacado**, ya que desarmar tarimas embaladas genera retrasos logísticos graves.
- **Disparador:** En el momento exacto en que almacén cambia el estado del pedido a `EN_SURTIDO`, el sistema asigna de forma automática una tarea preventiva al ATC creador (con visibilidad total para Supervisora Alma) para contactar al cliente y ratificar:
  1. Domicilio exacto de entrega (sucursal o taller).
  2. Nombre completo del receptor en sitio.
  3. Teléfono móvil directo de contacto.
  4. Horario autorizado de recepción de carga.
  5. Fletera asignada y estatus de seguro de viaje.
- Esta información se imprime directamente en la **Hoja de Embarque y Pase de Salida** para auxilio del chofer repartidor.

---

## 8. Regla de Negocio 7: Motor de Backorder, Tránsito Marítimo y Cola FIFO

### 8.1. Definición y Registro de Embarque
Aplica para pedidos respaldados por rollos que vienen en tránsito marítimo (embarque en contenedor) o programados en bodega de telares. En el pedido se registra obligatoriamente:
- `numeroContenedor` (ej. *MSCU-829104-1*)
- `fechaCapturaPedido`
- `fechaEstimadaArriboContenedor` (ETA)

### 8.2. Los Tres Formatos de Cotización y Cobro en Backorder
1. **Contado con Anticipo:** El cliente abona un pago inicial para asegurar y congelar su metraje en el contenedor. Al arribar la tela y medirse los rollos reales, se liquida la diferencia (saldo a favor o pago complementario).
2. **Contado al Arribo (Cierre Fiscal):** El cliente se forma en la cola de espera sin pago anticipado, acordando que la factura y el pago se realizarán en el mismo mes calendario en que arribe el contenedor a bodega.
3. **Crédito Comercial:** Se aparta el turno en cola y, al llegar la tela, se surte contra su línea de crédito autorizada tras confirmar la vigencia de la Orden de Compra.

### 8.3. Semáforos de Notificación Preventiva ATC
- **15 Días Antes del Arribo (Semáforo Ámbar):** El sistema alerta a ATC para realizar una llamada o enviar mensaje de WhatsApp al cliente para revalidar si la Orden de Compra sigue vigente y mantener activo su apartado.
- **5 Días Antes del Arribo (Semáforo Rojo):** Notificación de arribo inminente para programar la liquidación del pedido, generar el CFDI 4.0 y preparar patio de descarga y corte.

### 8.4. Recorrido Automático en Cascada de la Cola FIFO
- La cola de espera por contenedor opera bajo estricto orden cronológico (Turno `#1`, `#2`, `#3`...).
- Si un cliente cancela o desiste durante la revalidación de 15 días, el sistema cancela el pedido y **recorre en cascada la posición de todos los clientes posteriores (`posicionCola - 1`)**.
- El metraje liberado se asigna automáticamente al siguiente cliente en espera de ese contenedor o de contenedores con fechas posteriores.

---

---

## 9. Reglas de Negocio Derivadas de la Sesión #2 (21 de Octubre de 2026)

### 9.1. Regla 8: Matriz de Días y Horarios de Entrega por Cliente (Lunes a Sábado) & Retención en Bodega en Espera de Ruta
- **Problemática Detectada:** Los clientes de mayoreo y talleres de maquila externa no reciben mercancía de forma continua de lunes a viernes, sino en días fijos pactados (ej. únicamente Lunes y Miércoles, o solo Jueves) y en ventanas horarias estrictas (ej. 09:00 a 14:00 hrs). Si el chofer acude fuera de ese día u horario, el cliente rechaza la entrega, generando fletes falsos, desgaste vehicular y riesgo de daño de la tela.
- **Configuración en el Catálogo de Días Permitidos:**
  - En cada domicilio de entrega (`ClientAddress`) se registran mediante selectores booleanos los días autorizados de recepción: `[Lun] [Mar] [Mié] [Jue] [Vie] [Sáb]`.
  - Se define la ventana horaria oficial: selecciones predeterminadas (`09:00 - 14:00`, `09:00 - 17:00`, `09:00 - 18:00`) o ventana personalizada.
- **Candado de Retención Física en Bodega (`Bodega en Espera de Ruta`):**
  - Cuando un pedido concluye su proceso de corte, empaque y facturación, el sistema evalúa de inmediato si la fecha y hora actual coinciden con los días hábiles de recepción del cliente.
  - Si el pedido está terminado el lunes pero el cliente solo recibe el jueves, **el WMS prohíbe subir el bulto al vehículo de reparto**. El pedido queda clasificado en estado visual `Bodega en Espera de Ruta` hasta la noche anterior o la mañana del día autorizado.

### 9.2. Regla 9: Flota Propia de Formatex (8 Camionetas) y Rutas Fijas Programadas (Drive In / Drivin)
- **Operación de Embarques:** Formatex cuenta con **8 vehículos propios (camionetas)** para el reparto metropolitano y regional, coordinados por Carla (Jefatura de Embarques) mediante la plataforma de ruteo **Drive In / Drivin**.
- **Rutas Programadas Foráneas — El Caso Ocotlán (Jalisco):**
  - Existen rutas fijas semanales fuera de la Zona Metropolitana de Guadalajara. Específicamente, la **Ruta a Ocotlán** opera de forma estricta los días **Martes y Jueves**.
  - **Regla de Corte de Surtido:** Un pedido con destino a Ocotlán que sea liberado por crédito o terminado de cortar el lunes por la tarde/noche ya no alcanza la logística de carga del martes temprano. Por ende, su entrega se reprograma forzosamente para el **Jueves**.
  - **Sincronización ATC ↔ Embarques:** ATC no podrá prometer entregas en días no habilitados para la ruta del cliente. Al capturar el pedido, el sistema despliega el semáforo de ruta: *"Ruta Ocotlán: Próxima salida disponible Jueves"*.

### 9.3. Regla 10: Canal E-Commerce Web (Shopify / Nayeli / Lista F10)
- **Venta Minorista en Línea:** Formatex opera una tienda en línea abierta al público en general sobre la plataforma **Shopify**, gestionada por **Nayeli** (Atención a Clientes Web).
- **Flujo Operativo Diferenciado:**
  1. **Compra en Una Sola Exhibición:** Los clientes finales no requieren expediente crediticio, carta de fletera ni alta de distribuidor.
  2. **Lista de Precios F10:** El catálogo de Shopify se liquida automáticamente bajo la lista oficial `F10` (Venta Web / Catálogo Especial).
  3. **Validación de Pago:** Una vez que la pasarela de pagos confirma la dispersión bancaria y Nayeli recibe la notificación, se genera el pedido en WMS marcándolo con el origen `WEB_SHOPIFY`.
  4. **Embarque y Guías Prepagadas:** Los pedidos nacionales se despachan con guías prepagadas de paquetería (DHL, FedEx, Estafeta).
  5. **Pedidos Internacionales Excepcionales (ej. Colombia / Medellín):** Para compras transfronterizas excepcionales, Nayeli canaliza la cotización de flete internacional directamente con **Luis Javier**, emitiéndose la proforma con el costo de envío exterior antes de despachar la tela.

### 9.4. Regla 11: Tratamiento de Muestras (Muestrarios y Libros) como Producto Terminado por Pieza (PZA)
- **Naturaleza del Artículo:** Los muestrarios, carpetas de colección y libros de telas son considerados **Producto Terminado** y no rollos de tela en metros lineales.
- **Regla de Captura y Almacén:**
  - Unidad de medida oficial: **`PZA` (Pieza / Unidad)**.
  - No aplica metraje lineal, cálculo de corte, tolerancia de rollo ni generación de retales (`RETAL`).
  - El precio en listas y convenios se liquida por pieza unitaria (`$/PZA`).
  - En la interfaz de captura de pedidos, el WMS conmuta automáticamente la etiqueta de cantidad a "Piezas" y desactiva el motor de sugerencia de corte de rollos cuando el SKU corresponde a un muestrario.

### 9.5. Regla 12: Traspasos Inter-Compañía Digitales Telares y Tejidos (TNT) ↔ Formatex
- **Estructura Corporativa Hermana:**
  - **Telares y Tejidos (TNT)** y **Formatex** pertenecen al **mismo propietario** ("se pagan y se dan el vuelto").
  - Telares y Tejidos funge como la importadora oficial y custodia de rollos en bodegas colindantes (Río Tototlán / Río La Barca / Bodega Rensselaer).
  - Diariamente, Formatex solicita a Telares el traspaso físico de rollos para resurtir pedidos comerciales.
- **Eliminación del Flujo Informal de WhatsApp:**
  - Históricamente, el personal de Formatex enviaba capturas de pantalla de la pantalla del monitor o fotos por WhatsApp al encargado de bodega de Telares para pedir telas.
  - **Nuevo Módulo de Solicitud Digital de Traspaso:**
    1. Se genera una **Orden de Traspaso Inter-Compañía (Formatex $\leftarrow$ Telares)** con folio formal en el WMS.
    2. El sistema almacena la bitácora de auditoría digital completa: quién solicitó, fecha, hora, rollos requeridos (SKU, metraje, color).
    3. Al ingresar físicamente a la rampa de Formatex, el almacenista escanea los rollos con la Handheld TC22 para confirmar el traspaso y darles alta en el stock disponible de venta.

### 9.6. Regla 13: Bloqueo Estricto de Precios Especiales y Listas Asignadas en Captura
- **Mandato Directivo:** Andrea Ramírez y la Jefatura de ATC determinaron que los precios especiales acordados por Dirección y los precios derivados de las 10 listas oficiales deben estar **estrictamente precargados y bloqueados para edición manual** en la pantalla de pedidos.
- **Candado de Integridad:** Se prohíbe que el agente de ATC teclee manualmente o modifique a discreción el precio unitario del metro de tela. Cualquier excepción comercial no tabulada deberá ser gestionada como descuento porcentual sujeto a las políticas de autorización, o requerirá el alta formal previa del convenio en la Matriz de Precios Especiales.

---

## 10. Matriz de Compromisos y Entregables Actualizada (Checklist)

| Responsable | Entregable / Acción Acordada | Estatus |
| :--- | :--- | :---: |
| **Andrea Ramírez / Alma** | Compartir catálogo detallado de las 10 listas de precios oficiales vigentes | **Completado (12,386 precios ingeridos)** |
| **Andrea Ramírez** | Compartir archivo Excel de Precios Especiales autorizados por Dirección General | **Completado (306 convenios ingeridos)** |
| **Andrea Ramírez** | Enviar paquete documental de alta de clientes: CSF muestra, Carta de fleteras y seguro | Pendiente envío |
| **Formatex / Carla** | Sesión de levantamiento de Embarques y plataforma Drive In | Programada para semana siguiente |
| **Formatex / Israel** | Sesiones de levantamiento de Almacén y recepción de Telares (Sesión 1 y 2) | Programada Viernes 23 de Octubre |
| **Formatex / Nayeli** | Validación de variantes Shopify y envíos internacionales | Por agendar breve llamada |
| **Movida TCI** | Entrega de documento oficial v1.1 consolidado con Sesión #2 para firma | **Completado** |
| **Movida TCI** | Implementación de selector de días de ruta, bloqueo de precios y soporte de muestras en WMS | **Completado en frontend v1.4.1** |

---

## 11. Formalización y Firmas de Conformidad

Al firmar el presente documento, las partes manifiestan su plena conformidad con los requerimientos, candados de seguridad operativa y reglas de negocio aquí descritas, reconociéndolas como el marco oficial y vinculante de desarrollo y aceptación para el módulo de Atención al Cliente (ATC), Ventas y Conexión Logística del WMS 360+ Formatex:

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Alma** | **Andrea Ramírez** |
| Jefatura de Atención al Cliente | Atención al Cliente & Operaciones |
| Forma Textil S. de R.L. de C.V. | Forma Textil S. de R.L. de C.V. |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Ricardo Zerpa** | **Jonathan Palacios** |
| Arquitectura de Producto & Procesos | Dirección Técnica & Desarrollo WMS |
| Movida TCI LLC | Movida TCI LLC |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |
