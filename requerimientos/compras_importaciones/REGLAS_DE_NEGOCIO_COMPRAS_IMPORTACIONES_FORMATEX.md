# Formatex WMS 360° — Especificación de Reglas de Negocio
## Módulo de Compras Internacionales, Importaciones & Sinergia Inter-Compañía
### (Telares y Tejidos S.A. de C.V. ↔ Forma Textil S. de R.L. de C.V.)

**Fecha de Levantamiento:** Viernes, 16 de Octubre de 2026  
**Última Actualización / Consolidación:** Miércoles, 21 de Octubre de 2026  
**Organización:** Forma Textil S. de R.L. de C.V. (Formatex) & Telares y Tejidos (Rensselaer / TNT)  
**Proveedor Tecnológico:** Movida TCI LLC  
**Versión:** 1.2 (Oficial Consolidada con Documentación Recibida y Preparación Fase 2)  
**Participantes en las Sesiones:**
- **Elba Vázquez** — Encargada de Compras & Costeo de Importación (Telares y Tejidos / Formatex)
- **Mane Gómez** — Especialista de Importaciones & Tráfico Aduanal (Telares y Tejidos)
- **Andrea Ramírez** — Atención al Cliente & Operaciones (Formatex)
- **Israel** — Jefe de Almacén & Logística (Formatex)
- **Jonathan Palacios** — Dirección Técnica & Desarrollo WMS (Movida TCI)
- **Santiago Pérez** — Consultoría de Procesos (Movida TCI)
- **Ricardo Zerpa** — Arquitectura de Producto & Dirección (Movida TCI)
- **Ricardo Pérez** — Director General & Propietario (Formatex & Telares y Tejidos)

---

## 1. Propósito y Marco de Aceptación Vinculante

El presente documento formaliza de manera transparente y exhaustiva todas las **reglas de negocio, criterios de costeo, flujos operativos, modelos de traspaso y políticas administrativas** consensuados entre el área de Compras e Importaciones de Telares y Tejidos / Formatex y el equipo de ingeniería de Movida TCI, integrando la documentación oficial enviada por Elba Vázquez (pedimentos SAT, fórmulas de costeo landed, órdenes de compra a proveedores chinos y formatos de traspaso).

### Finalidad Operativa y Contractual:
Este documento constituye el **anexo técnico vinculante** para el subsistema de Compras e Importaciones del WMS 360°. Su objetivo es asentar por escrito los requerimientos específicos de la cadena de suministro internacional (China) y la logística de reposición entre las empresas hermanas (**Telares y Tejidos** como importadora/almacén matriz y **Formatex** como comercializadora), garantizando un estándar único, auditable y libre de discrepancias en el desarrollo de software.

---

## 2. Regla de Negocio 1: Arquitectura Inter-Compañía y "Las Dos Camisas de Elba"

### 2.1. Estructura del Grupo Textil y Razones Sociales
1. **Telares y Tejidos S.A. de C.V. (TNT / Rensselaer — Bodega Río Tototlán `BOD-TNT`):** 
   - Es la persona moral que figura como **importadora oficial** ante el padrón de importadores del SAT.
   - Realiza todas las compras internacionales de telas a fábricas en el extranjero (principalmente molinos en China y algunos fabricantes nacionales).
   - Negocia contratos de flete marítimo internacional (FCL / Contenedor completo), pólizas de seguro de carga, maniobras portuarias y el despacho aduanal con liquidación bancaria de pedimentos (Aduana de Manzanillo, Colima).
   - Su bodega central (**Bodega Río Tototlán / Rensselaer**) opera como el **Hub Paletizado de Entrada**: almacena pallets cerrados y bultos de rollos enteros sin fraccionar.
   - *En Telares no existe mesa de corte ni servicio de retazos al menudeo.*
2. **Forma Textil S. de R.L. de C.V. (Formatex — Bodega Matriz Zapopan `BOD-PRI`):**
   - Es la persona moral dedicada a la comercialización mayorista, canal ATC, proyectos corporativos y venta de telas en piso y mostrador.
   - Cuenta con espacio físico limitado en su bodega de Zapopan (Río La Barca), por lo que no puede albergar contenedores completos de 700 a 900 rollos.
   - Adquiere producto a Telares y Tejidos de forma fraccionada y continua bajo demanda diaria (rollos completos de 50 metros).
   - Ofrece el servicio de corte fraccionado (1m, 3m, 15m), gestión de retazos, mermas, muestrarios (piezas PZA) y cotización bajo 10 listas oficiales de precios.

### 2.2. El Rol Dual de Elba Vázquez (Las Dos Camisas)
Elba Vázquez desempeña dos roles operativos diferenciados que el sistema WMS 360+ reconoce mediante un selector corporativo en `/compras`:
* **Camisa Telares (Compras Internacionales China):** Elba negocia con molinos chinos en USD, programa fechas de zarpe marítimo, supervisa la llegada de contenedores a Manzanillo con Mane Gómez y calcula el costeo Landed en moneda nacional al ingresar la mercancía a `BOD-TNT`.
* **Camisa Formatex (Resurtido Local Inter-Compañía):** Elba analiza los faltantes de inventario en Zapopan junto con Israel (Jefe de Almacén) y emite requisiciones de traspaso a Telares para que la camioneta propia de Formatex recoja los rollos en Tototlán.

---

## 3. Regla de Negocio 2: Ciclo de Compras Internacionales a China y Frecuencia de Órdenes

### 3.1. Frecuencia y Detonación de Órdenes a China
- **Frecuencia:** Se genera **una (1) orden de compra semanal a China**.
- **Detonante:** La orden se emite semanalmente a partir de la directiva y corrida semanal de resurtido de Dirección General (Don Ricardo Pérez), quien define las telas y metrajes a reponer con base en la demanda y proyecciones de venta del Master Resurtido ($S+P+T$ vs $4M \times 4.5$).

### 3.2. Ciclos de Tiempo en Origen y Logística Marítima
- **Tiempos de Fabricación:** La producción en las plantas textiles de China oscila entre **cuatro (4), seis (6) y ocho (8) semanas** según el fabricante y el tipo de tejido.
- **Logística Marítima:** La travesía marítima navega con destino habitual al **Puerto de Manzanillo, Colima** (Aduana 160).
- **Capacidad de Embarque:** Cada contenedor marítimo alberga típicamente entre **600, 700 y hasta 900 rollos de tela** (aprox. 30,000 a 50,000 metros).

### 3.3. Ciclo de Vida de la Orden de Compra Internacional en el WMS
El WMS reemplaza las hojas de cálculo manuales con un flujo de estados estandarizado:
1. `BORRADOR`: Orden en confección basada en la directiva de resurtido.
2. `CONFIRMADA`: Aprobada internamente para envío formal al proveedor.
3. `ENVIADA_PROVEEDOR`: Transmitida a la fábrica en China con costos en USD.
4. `EN_TRANSITO`: Contenedor a bordo de buque marítimo, con número de contenedor oficial asignado (`MSCU-...`, `TGHU-...`) y fecha estimada de arribo (ETA).
5. `EN_RECEPCION`: Contenedor en rampa de descarga en Bodega Tototlán (`BOD-TNT`).
6. `COMPLETADA`: Rollos verificados e ingresados al inventario de Telares con etiquetas HU.

---

## 4. Regla de Negocio 3: Homologación del Catálogo (Nombre Chino vs. Nombre Comercial)

### 4.1. Diagnóstico del Proceso Actual
- En China, las fábricas identifican cada producto mediante sus propios códigos técnicos y denominaciones de origen (ej. *XY-9082 Polyester Twill 300g* o *Seda Cruda ZH-14*).
- Al internarse la mercancía a México y comercializarse a través de Formatex, se le asigna un **Nombre Comercial** en español (ej. *Lino Provenza Crudo*).
- Anteriormente, la equivalencia entre el nombre del proveedor chino y el nombre comercial mexicano se llevaba de forma manual en hojas de Excel o se memorizaba por el personal de compras, ocasionando confusiones y retrasos.

### 4.2. Estructura Unificada en la Entidad `SkuMaster` del WMS
En el catálogo maestro del WMS, cada SKU textil integra de forma nativa los atributos de homologación:
- `codigo`: Código comercial interno Formatex (ej. `LENIGIRO`).
- `nombre`: Nombre comercial en español (ej. *Enigma Iron*).
- `color`: Denominación de color comercial (ej. *Iron*).
- `composicion`: Composición textil (ej. *100% Poliéster*, *85% Lino / 15% Algodón*).
- `anchoMetros`: Ancho útil en metros (ej. *1.50 m*, *2.80 m*).
- `pesoKgPorMetro`: Peso por metro lineal o gramaje en $g/m^2$.
- `supplierId`: Identificador del proveedor fabricante original.

### 4.3. Regla de Catálogo Compartido
- El catálogo de telas es **único e idéntico** para Telares y Tejidos y Formatex.
- Los nombres, códigos y especificaciones técnicas no cambian entre empresas; lo único que difiere son los saldos de inventario en cada bodega física y las cuentas contables de costeo.

---

## 5. Regla de Negocio 4: Doble Costeo, Divisas y Trazabilidad Histórica por Pedimento

### 5.1. Doble Estructura de Costeo Obligatoria
Para cada producto y embarque internacional, el sistema registrará dos dimensiones de costo:
1. **Costo en Origen (`costoOrigenUSD`):** Precio unitario de compra pactado con el proveedor extranjero en Dólares Americanos ($/m USD).
2. **Costo Puesto en México (`costoPuestoMexicoMXN` / Landed Cost):** Costo total final por metro en Pesos Mexicanos ($/m MXN).

### 5.2. Fórmula Oficial de Costeo Landed de Elba Vázquez
Con base en el archivo oficial `CALCULO DE COSTOS DE IMPORTACION (COSTEO).xlsx`, la fórmula aplicada por Elba se modela en el WMS como:

$$\text{Costo Mercancía MXN} = \text{Precio FOB USD} \times \text{Tipo de Cambio Oficial Pedimento SAT}$$

$$\text{Factor Gastos Incrementables} = 1 + \frac{\text{Gastos Incrementables \%}}{100} \quad (\approx 23.00\%)$$

$$\text{Costo Landed Unitario} = (\text{Costo Mercancía MXN} \times \text{Factor Incrementables}) + \frac{\text{Flete Marítimo y Seguro Proporcional}}{\text{Metros Totales Contenedor}}$$

Donde los **Gastos Incrementables** consolidan:
* Impuesto General de Importación (IGI / Arancel aduanal).
* Derecho de Trámite Aduanero (DTA) y prevalidación SAT.
* Flete marítimo internacional y maniobras de puerto en Manzanillo.
* Honorarios de la patente de la Agencia Aduanal.

### 5.3. Regla Crítica del Tipo de Cambio Histórico por Pedimento
- **Prohibición de Tasas Flotantes Actuales:** Queda estrictamente prohibido recalcular el costo histórico de una importación anterior utilizando el tipo de cambio del día de la consulta o la tasa bancaria del DOF actual.
- **Anclaje al Pedimento Aduanal:** Todo costeo de importación en moneda nacional queda anclado de forma inmutable al **Tipo de Cambio Oficial registrado en el Pedimento de Importación en la fecha en que fue pagado y desaduanado ante el SAT** (ej. $18.3688 MXN/USD según `PEDIMENTO.pdf`).
- **Campos Mandatorios del Embarque en WMS:**
  - `numeroPedimento`: Folio aduanal oficial de 15 dígitos (ej. `26 16 1924 6003496`).
  - `fechaPagoPedimento`: Fecha exacta de liquidación bancaria del pedimento aduanal.
  - `tipoCambioPedimento`: Tipo de cambio específico aplicado por el SAT en el pedimento.
  - `aduanaDespacho`: Aduana de entrada (ej. *16 - Manzanillo, Colima*).

---

## 6. Regla de Negocio 5: Reposición Inter-Bodegas (Telares ➔ Formatex)

### 6.1. Frecuencia y Modalidades de Requisición
- **Frecuencia Regular:** Se generan entre **cinco (5) y seis (6) requisiciones semanales de Formatex hacia Telares y Tejidos**.
- **Consolidado Matutino Diario:** Al arranque de cada día hábil, el equipo de operaciones procesa un pedido concentrado que agrupa los rollos requeridos por los clientes cuyas compras se formalizaron el día anterior (ej. 10 clientes con requerimientos específicos). Estos rollos se transfieren y reciben el mismo día.
- **Traspasos Exprés Vespertinos:** Si un cliente solicita un pedido urgente a media tarde, se genera una orden de traspaso inmediata de Formatex a Telares, incluso por **un solo rollo individual (50m)**, para ser recolectado en la vuelta de la tarde.

### 6.2. Regla Operativa de Surtido en Telares (Solo Rollos Enteros de 50m)
- En la bodega de Telares (Tototlán), el personal de rampa **únicamente despacha rollos enteros cerrados (50 metros estándar)**.
- Queda prohibido que Telares fraccione rollos o realice cortes de metraje menudeado. Cualquier fraccionamiento o retazo se ejecuta en la mesa de corte de Formatex Zapopan tras haber recibido el rollo entero.

### 6.3. Digitalización del Formato de WhatsApp
Se reemplaza la práctica informal de enviar mensajes de texto y fotos por WhatsApp mediante el submódulo de **Requisiciones Inter-Compañía** en el WMS:
1. **Generación con Folio Digital:** Se crea la requisición con folio consecutivo (ej. `REQ-TNT-2026-0001`).
2. **Generador de Ficha WhatsApp:** Botón *"Copiar p/ WhatsApp"* que genera texto formateado listo para enviar al grupo de Tototlán y al chofer:
   ```text
   🏢 FORMATEX ➔ TELARES Y TEJIDOS (REQUISICIÓN DE ROLLOS)
   📋 Folio: REQ-TNT-2026-0001
   👤 Solicitó: Israel (Jefe de Almacén)
   🚚 Ruta / Camioneta: Camioneta Flota Propia (Tototlán ➔ Zapopan)
   ⏰ Horario sugerido: Vuelta Vespertina (02:00 PM)

   DETALLE DE ROLLOS SOLICITADOS (50m c/u):
   • ENIGMA IRON (Iron): 10 rollos (500m)
   • LINO VERDE OLIVA: 4 rollos (200m)

   Total: 14 rollos (700 metros)
   Favor de tener listos en rampa de Tototlán para el chofer.
   ```
3. **Vale de Carga Impreso:** Formato físico con desglose de partidas y recuadros de firma (*Entrega Bodega Tototlán* vs. *Recibe Chofer Formatex*).
4. **Flujo Operativo de 3 Estados:**
   - 🟡 `SOLICITADA`: Requisición creada en WMS por Israel o Elba.
   - 🚚 `EN_RUTA_CAMIONETA`: Chofer cargó la camioneta en Tototlán e inicia trayecto a Zapopan.
   - ✅ `RECIBIDA_FORMATEX`: Rollos descargados y confirmados en Zapopan, sumándose al stock físico.

---

## 7. Regla de Negocio 6: Facturación Inter-Compañía y Regla de Protección de Margen

### 7.1. Margen Inter-Empresa (Telares a Formatex)
- Telares y Tejidos factura la mercancía transferida a Formatex aplicando un margen de intermediación comercial autorizado de entre el **7% y el 12%** sobre el costo de importación puesto en México (`costoPuestoMexicoMXN`), o mediante el factor de transferencia inter-compañía formal **FM = 0.88**.

### 7.2. Regla del Costo Más Alto ante Múltiples Embarques
- Es común que en las bodegas de Telares coexistan rollos de una misma tela que arribaron en contenedores de distintas fechas o años, con costos de flete marítimo o aranceles dispares.
- **Regla Operativa:** Al facturar producto de Telares a Formatex, el sistema tomará como base de costeo **el costo más alto de los últimos embarques recibidos**, blindando la rentabilidad del grupo y asegurando que ninguna fluctuación cambiaria o logística afecte negativamente el margen.

---

## 8. Regla de Negocio 7: Integración con Atención al Cliente (ATC) y Disponibilidad Unificada 360°

El personal de Atención al Cliente (ATC) y Ventas cuenta con un panel visual donde cada tela exhibe con absoluta transparencia sus tres fuentes de disponibilidad:
1. `Stock Físico Formatex`: Rollos físicamente ubicados en la bodega de Zapopan listos para entrega inmediata.
2. `Stock Telares (Tototlán)`: Rollos en bodega matriz disponibles para traspaso en camioneta en 24 horas.
3. `Stock en Tránsito Marítimo`: Rollos a bordo de contenedor, con número de contenedor, pedimento SAT y fecha estimada de arribo (ETA).

### Fórmula de Disponibilidad Neta:
$$\text{Disponibilidad Neta} = (\text{Físico Zapopan} + \text{Físico Tototlán} + \text{Tránsito Marítimo}) - (\text{Apartados 24h/72h} + \text{Backorders FIFO})$$

---

## 9. Regla de Negocio 8: Preparación Estratégica para Fase 2 (WMS en Telares y Tejidos)

Con base en la directiva de Don Ricardo Pérez, el WMS 360+ queda arquitectónicamente preparado para su despliegue en Telares como segunda fase:
1. **Base de Datos Multi-Bodega Unificada:** La entidad `Warehouse` ya cuenta con `BOD-PRI` (Formatex) y `BOD-TNT` (Telares), permitiendo gestionar ambos inventarios en la misma infraestructura tecnológica.
2. **WMS Slim para Telares:** En la fase 2, el perfil de Telares operará con una interfaz simplificada enfocada en:
   * Recepción de contenedores completos FCL desde China.
   * Gestión de racks de alta densidad para pallets y rollos enteros.
   * Despacho de requisiciones y traspasos hacia Formatex.
   * Sin mesas de corte, sin retazos y sin venta menudeada.

---

## 10. Matriz de Documentación Recibida y Estatus

| Documento Oficial Recibido | Descripción Técnica | Estatus en WMS 360+ |
| :--- | :--- | :---: |
| `CALCULO DE COSTOS DE IMPORTACION (COSTEO).xlsx` | Fórmulas de Elba para costeo FOB, incremento 23% y landed cost | **Integrado en Módulo de Costeo** |
| `PEDIMENTO.pdf` | Pedimento SAT oficial Aduana Manzanillo (18.3688 TC) | **Integrado en Campos SAT** |
| `ORDEN DE COMPRA FORMATEX A TELARES.pdf` | Formato histórico de solicitud inter-compañía | **Digitalizado en Requisiciones** |
| `EJEMPLO DE ORDEN DE COMPRA A PROVEEDOR.pdf` | Formato internacional de OC en USD para China | **Integrado en Nueva OC China** |
| `CATALOGO DE PRODUCTOS.xlsx` | 1,499 SKUs con especificaciones técnicas | **Ingestado en SkuMaster** |
| `MASTER 19 DE OCTUBRE 2026.xlsx` | Relación de stock físico y tránsitos marítimos | **Ingestado en WMS Database** |
| `FORMATO DE HOJA ELECTRONICA.xlsx` | Formato de captura contable CONTPAQi | **Soportado en Exportación** |

---

## 11. Formalización y Firmas de Conformidad

Al firmar el presente documento, las partes manifiestan su plena conformidad con los requerimientos, criterios de costeo, reglas inter-compañía y flujos operativos aquí descritos, reconociéndolos como el marco oficial de desarrollo y control de cambios para el módulo de Compras e Importaciones del WMS 360+ Formatex:

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Elba Vázquez** | **Mane Gómez** |
| Jefa de Compras & Costeo de Importación | Especialista en Importaciones & Tráfico Aduanal |
| Telares y Tejidos / Formatex | Telares y Tejidos S.A. de C.V. |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Andrea Ramírez** | **Israel** |
| Atención al Cliente & Operaciones | Jefe de Almacén & Logística |
| Forma Textil S. de R.L. de C.V. | Forma Textil S. de R.L. de C.V. |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Ricardo Pérez** | **Jonathan Palacios** |
| Dirección General & Propietario | Dirección Técnica & Desarrollo WMS |
| Formatex & Telares y Tejidos | Movida TCI LLC |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |
