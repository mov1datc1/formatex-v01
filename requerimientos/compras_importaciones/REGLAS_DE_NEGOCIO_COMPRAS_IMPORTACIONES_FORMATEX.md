# Formatex WMS 360° — Especificación de Reglas de Negocio
## Módulo de Compras Internacionales, Importaciones & Coordinación Inter-Compañía
### (Telares y Tejidos S.A. de C.V. ↔ Forma Textil S. de R.L. de C.V.)

**Fecha de Levantamiento:** Viernes, 16 de Octubre de 2026  
**Organización:** Forma Textil S. de R.L. de C.V. (Formatex) & Telares y Tejidos (TNT)  
**Proveedor Tecnológico:** Movida TCI LLC  
**Versión:** 1.0 (Oficial para Revisión, Edición y Firma de Conformidad)  
**Participantes en la Sesión:**
- **Elba** — Encargada de Compras e Importaciones (Telares y Tejidos / Formatex)
- **Mane** — Especialista de Importaciones (Telares y Tejidos)
- **Andrea Ramírez** — Atención al Cliente & Operaciones (Formatex)
- **Jonathan Palacios** — Dirección Técnica & Desarrollo WMS (Movida TCI)
- **Santiago Pérez** — Consultoría de Procesos (Movida TCI)
- **Ricardo Zerpa** — Arquitectura de Producto & Dirección (Movida TCI)

---

## 1. Propósito y Marco de Aceptación Vinculante

El presente documento formaliza de manera transparente y exhaustiva todas las **reglas de negocio, criterios de costeo, flujos operativos y políticas administrativas** consensuados durante la entrevista operativa sostenida el 16 de octubre de 2026 entre el área de Compras e Importaciones de Telares y Tejidos / Formatex y el equipo de ingeniería de Movida TCI.

### Finalidad Operativa y Contractual:
Este documento constituye el **anexo técnico vinculante** para el subsistema de Compras e Importaciones del WMS 360°. Su objetivo es asentar por escrito los requerimientos específicos de la cadena de suministro internacional (China) y la logística de reposición entre las empresas hermanas (**Telares y Tejidos** como importadora/almacén matriz y **Formatex** como comercializadora), garantizando un estándar único, auditable y libre de discrepancias en el desarrollo de software.

---

## 2. Regla de Negocio 1: Arquitectura Inter-Compañía y Separación Operativa

### 2.1. Roles y Razones Sociales
1. **Telares y Tejidos (TNT):** 
   - Es la persona moral que figura como importadora ante las aduanas mexicanas.
   - Realiza todas las compras internacionales de telas a fábricas en el extranjero (principalmente China y algunos fabricantes nacionales).
   - Gestiona el transporte marítimo mediante freight forwarders, seguros de mercancía en tránsito, maniobras portuarias y el despacho aduanal con liquidación de pedimentos.
   - Su bodega central (Bodega Rensselaer) opera como el almacén de resguardo masivo y custodia matriz de los rollos importados.
2. **Forma Textil (Formatex):**
   - Es la persona moral dedicada a la comercialización mayorista, canal ATC, proyectos corporativos y venta de telas en piso.
   - Cuenta con espacio físico limitado en su bodega de distribución, por lo que no puede albergar contenedores completos de 700 a 900 rollos.
   - Solicita y adquiere producto a Telares y Tejidos de forma fraccionada y continua bajo demanda diaria.

### 2.2. Alcance en WMS 360° (Módulo Administrativo Integrado)
- El sistema WMS 360° evitará duplicar sistemas o crear dos plataformas aisladas.
- Se implementará un **Módulo Administrativo de Compras e Importaciones** que permitirá gestionar las operaciones de Telares y Tejidos (proveedores extranjeros, órdenes de compra en USD, costeo Landed en MXN y contenedores en tránsito) compartiendo de forma nativa los catálogos y la visibilidad de inventario hacia Formatex.

---

## 3. Regla de Negocio 2: Ciclo de Compras Internacionales a China y Frecuencia de Órdenes

### 3.1. Frecuencia y Detonación de Órdenes a China
- **Frecuencia:** Se genera **una (1) orden de compra semanal a China**.
- **Detonante:** La orden se emite semanalmente a partir del análisis y la directiva de resurtido enviada por Dirección General (Ricardo Zerpa / Dirección), quien define las telas y metrajes a reponer con base en la demanda y proyecciones de venta.

### 3.2. Ciclos de Tiempo en Origen y Tránsito
- **Tiempos de Fabricación:** La producción en las plantas textiles de China oscila entre **cuatro (4), seis (6) y ocho (8) semanas** según el fabricante y el tipo de tejido.
- **Logística Marítima:** Una vez lista la producción, se coordina la orden de embarque con el proveedor y el freight forwarder, navegando con destino habitual al **Puerto de Manzanillo, Colima**.
- **Capacidad de Embarque:** Cada contenedor marítimo alberga típicamente entre **600, 700 y hasta 900 rollos de tela**.

### 3.3. Ciclo de Vida de la Orden de Compra Internacional en el WMS
El WMS reemplaza las hojas de cálculo manuales con un flujo de estados estandarizado:
1. `BORRADOR`: Orden en confección basada en la directiva de resurtido.
2. `EMITIDA_PROVEEDOR`: Enviada formalmente a la fábrica en China con costos en USD.
3. `EN_PRODUCCION`: En proceso de hilado, teñido y acabado (4 a 8 semanas).
4. `ZARPADO_EN_TRANSITO`: Contenedor a bordo de buque marítimo, con número de contenedor oficial asignado y fecha estimada de arribo (ETA).
5. `EN_PUERTO_ADUANA`: Arribado a puerto mexicano en proceso de revalidación, previo y desaduanamiento.
6. `RECEPCION_EN_BODEGA_TNT`: Descargado en Bodega Rensselaer para costeo final e ingreso al stock de Telares.

---

## 4. Regla de Negocio 3: Homologación del Catálogo (Nombre Chino vs. Nombre Comercial)

### 4.1. Diagnóstico del Proceso Actual
- En China, las fábricas identifican cada producto mediante sus propios códigos técnicos y denominaciones de origen (ej. *XY-9082 Polyester Twill 300g* o *Seda Cruda ZH-14*).
- Al internarse la mercancía a México y comercializarse a través de Formatex, se le asigna un **Nombre Comercial** en español (ej. *Lino Provenza Crudo*).
- Actualmente, la equivalencia entre el nombre del proveedor chino y el nombre comercial mexicano se lleva de forma manual en hojas de Excel o se memoriza por el personal de compras, ocasionando confusiones y retrasos.

### 4.2. Estructura Unificada en la Entidad `Sku` del WMS
En el catálogo maestro del WMS, cada SKU textil integrará de forma obligatoria los atributos de homologación:
- `codigoChina` / `nombreChino`: Código y denominación técnica del proveedor en origen.
- `nombreComercial`: Nombre oficial con el que se exhibe y factura en Formatex.
- `composicion`: Composición textil (ej. *100% Poliéster*, *85% Lino / 15% Algodón*).
- `anchoUtil`: Ancho útil en metros (ej. *1.40 m*, *2.80 m*).
- `gramaje`: Peso en gramos por metro cuadrado ($g/m^2$).
- `proveedorOrigenId`: Identificador del proveedor fabricante en catálogo.

### 4.3. Regla de Catálogo Compartido
- El catálogo de telas es **único e idéntico** para Telares y Tejidos y Formatex.
- Los nombres, códigos y especificaciones técnicas no cambian entre empresas; lo único que difiere son los saldos de inventario en cada bodega física y las cuentas contables de costeo.

---

## 5. Regla de Negocio 4: Doble Costeo, Divisas y Trazabilidad Histórica por Pedimento

### 5.1. Doble Estructura de Costeo Obligatoria
Para cada producto y embarque internacional, el sistema registrará dos dimensiones de costo:
1. **Costo en Origen (`costoOrigenUSD`):** Precio unitario de compra pactado con el proveedor extranjero en Dólares Americanos ($/m USD).
2. **Costo Puesto en México (`costoCostoPuestoMexicoMXN` / Landed Cost):** Costo total final por metro en Pesos Mexicanos ($/m MXN). Este cálculo consolida:
   - Costo de la mercancía convertido a moneda nacional.
   - Flete marítimo internacional.
   - Póliza de seguro internacional de transporte.
   - Gastos de maniobras portuarias y almacenaje en aduana.
   - Impuesto General de Importación (IGI / Arancel), Derecho de Trámite Aduanero (DTA) y honorarios de agencia aduanal.

### 5.2. Regla Crítica del Tipo de Cambio Histórico por Pedimento
- **Prohibición de Tasas Flotantes Actuales:** Queda estrictamente prohibido recalcular el costo histórico de una importación anterior utilizando el tipo de cambio del día de la consulta o la tasa bancaria del Diario Oficial de la Federación (DOF) actual.
- **Anclaje al Pedimento Aduanal:** Todo costeo de importación en moneda nacional queda anclado de forma inmutable al **Tipo de Cambio Oficial registrado en el Pedimento de Importación en la fecha en que fue pagado y desaduanado ante el SAT**.
- **Campos Mandatorios del Embarque en WMS:**
  - `numeroPedimento`: Folio aduanal oficial de 15 dígitos (año + aduana + patente + consecutivo).
  - `fechaPagoPedimento`: Fecha exacta de liquidación bancaria del pedimento aduanal.
  - `tipoCambioPedimento`: Tipo de cambio específico aplicado por el SAT en el pedimento.
  - `aduanaDespacho`: Puerto o aduana fronteriza (ej. *Manzanillo, Colima — Aduana 160*).
  - `agenteAduanal`: Nombre o razón social de la patente aduanal responsable.

---

## 6. Regla de Negocio 5: Reposición Inter-Bodegas (Telares y Tejidos → Formatex)

### 6.1. Frecuencia y Modalidades de Pedido
- **Frecuencia Regular:** Se generan entre **cinco (5) y seis (6) pedidos semanales de Formatex hacia Telares y Tejidos**.
- **Consolidado Diario Matutino:** Al arranque de cada día hábil, el equipo de operaciones procesa un pedido concentrado que agrupa los rollos requeridos por los clientes cuyas compras se formalizaron el día anterior (ej. 10 clientes con requerimientos específicos). Estos rollos se transfieren y reciben el mismo día.
- **Traspasos Exprés Vespertinos:** Si un cliente solicita un pedido urgente a media tarde, se genera una orden de traspaso inmediata de Formatex a Telares, incluso por **un solo rollo individual**, para ser surtido a la brevedad.

### 6.2. Coordinación Logística Física (Israel / Almacén)
- La gestión y coordinación del movimiento físico entre la Bodega Rensselaer (Telares) y la Bodega Formatex (patio de descarga, choferes y recepción) recae operativamente en la jefatura de almacén (Israel).
- El WMS registrará digitalmente el pase de salida de Telares y la orden de entrada en Formatex para mantener la conciliación continua de inventarios en tránsito local.

---

## 7. Regla de Negocio 6: Facturación Inter-Compañía y Regla de Protección de Margen

### 7.1. Margen Inter-Empresa (Telares a Formatex)
- Telares y Tejidos factura la mercancía transferida a Formatex aplicando un margen de intermediación comercial autorizado de entre el **7% y el 12%** sobre el costo de importación puesto en México (`costoPuestoMexicoMXN`).

### 7.2. Regla del Costo Más Alto ante Múltiples Embarques
- Es común que en las bodegas de Telares coexistan rollos de una misma tela que arribaron en contenedores de distintas fechas o incluso distintos años, con costos de flete marítimo o aranceles sensiblemente dispares.
- **Regla Operativa:** Al facturar producto de Telares a Formatex, el sistema tomará como base de costeo **el costo más alto de los últimos embarques recibidos**, blindando la rentabilidad de la empresa y asegurando que ninguna fluctuación cambiaria o logística afecte negativamente el margen pactado.
- **Reporte de Utilidad Pre-Factura:** Antes de timbrar el CFDI inter-empresa, el sistema presentará un reporte previo de rentabilidad que confirme que la utilidad porcentual real cumple con los parámetros vigentes.

---

## 8. Regla de Negocio 7: Integración con Atención al Cliente (ATC) y Disponibilidad Neta

### 8.1. Visibilidad Unificada de Inventario para ATC
El personal de Atención al Cliente (ATC) y ventas contará con un panel visual donde cada tela exhibirá con absoluta transparencia sus tres fuentes de disponibilidad:
1. `Stock Disponible Formatex`: Rollos físicamente ubicados en la bodega de Formatex listos para entrega inmediata.
2. `Stock Disponible Telares (Rensselaer)`: Rollos en bodega matriz disponibles para traspaso en el corte diario de 24 horas.
3. `Stock en Tránsito Marítimo`: Rollos a bordo de contenedor, con número de contenedor y fecha estimada de arribo (ETA).

### 8.2. Regla de Disponibilidad Neta (Descuento de Compromisos)
- El WMS calculará la disponibilidad en tiempo real mediante la fórmula:
  $$\text{Disponibilidad Neta} = (\text{Stock Físico TNT} + \text{Stock Físico Formatex} + \text{Tránsito}) - (\text{Apartados Activos 72h} + \text{Backorders FIFO})$$
- Queda prohibido ofrecer o comprometer rollos que ya cuenten con reserva en firme o posición asignada en cola de backorder para otros clientes.

---

## 9. Regla de Negocio 8: Trazabilidad Integral en Recepción (Lote - Proveedor - Embarque)

Al ingresar cualquier lote o rollo textil en el sistema WMS, será de carácter **mandatorio e ineludible** registrar:
1. **Lote de Fabricación:** Código de lote asignado por la fábrica textil de origen.
2. **Proveedor:** Identificación del fabricante extranjero o nacional.
3. **Contenedor / Factura de Importación:** Vinculación al contenedor marítimo o factura de compra correspondiente.
4. **Graduación de Calidad:** Inspección y clasificación de calidad (Conforme, Segunda, Saldo, Muestrario).

---

## 10. Matriz de Compromisos y Entregables (Checklist)

| Responsable | Entregable / Acción Acordada | Estatus |
| :--- | :--- | :---: |
| **Elba / Mane** | Compartir ejemplos de archivos Excel de cálculo de costos (FOB, gastos incrementables y costo Landed en México) | Pendiente envío |
| **Elba / Mane** | Compartir formato oficial de Órdenes de Compra a China y órdenes de pedido Formatex ↔ Telares | Pendiente envío |
| **Elba / Mane** | Compartir archivo maestro con la homologación actual de nombres chinos vs. nombres comerciales | Pendiente envío |
| **Elba / Mane** | Compartir capturas de pantalla de la estructura actual en CONTPAQi Comercial (módulo de compras y costos) | Pendiente envío |
| **Movida TCI** | Entrega de documento oficial de especificación y reglas de negocio para revisión y firma | **Completado** |
| **Movida TCI & Israel** | Agendar sesión técnica con Israel (Almacén) para afinar el flujo de transferencia física inter-bodegas | Por agendar |
| **Equipo Conjunto** | Agendar Sesión 2 para revisión a profundidad del Archivo Máster de Formatex | Por agendar |

---

## 11. Formalización y Firmas de Conformidad

Al firmar el presente documento, las partes manifiestan su plena conformidad con los requerimientos, criterios de costeo, reglas inter-compañía y flujos operativos aquí descritos, reconociéndolos como el marco oficial de desarrollo y control de cambios para el módulo de Compras e Importaciones del WMS 360+ Formatex:

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Elba** | **Mane** |
| Compras e Importaciones | Especialista en Importaciones |
| Telares y Tejidos / Formatex | Telares y Tejidos S.A. de C.V. |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |

<br/><br/>

| _________________________________________ | _________________________________________ |
| :---: | :---: |
| **Andrea Ramírez** | **Ricardo Zerpa** |
| Atención al Cliente & Operaciones | Arquitectura de Producto & Procesos |
| Forma Textil S. de R.L. de C.V. | Movida TCI LLC |
| Fecha: _____ / _____ / 2026 | Fecha: _____ / _____ / 2026 |

<br/><br/>

| _________________________________________ |
| :---: |
| **Jonathan Palacios** |
| Dirección Técnica & Desarrollo WMS |
| Movida TCI LLC |
| Fecha: _____ / _____ / 2026 |
