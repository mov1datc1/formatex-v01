# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.5] - 2026-10-21

### Added
- **Módulo de Compras & Abastecimiento con Flujo Dual Corporativo (`ComprasPage.tsx`):**
  - **Doble Sombrero de Compras (Telares vs. Formatex):**
    - Selector corporativo que bifurca la operación en dos modos de abastecimiento:
      - 🇨🇳 **Modo Telares y Tejidos (Importaciones Internacionales / China):** Gestión de compras masivas a molinos chinos en USD, fletes marítimos a Manzanillo, contenedores en tránsito e ingreso directo a la bodega hermana `BOD-TNT` (Río Tototlán). Sub-pestañas: *Órdenes de Compra (China)*, *Cola de Recepción en Telares* e *Historial de Importaciones*.
      - 🏢 **Modo Forma Textil (Requisiciones & Traspasos a Telares):** Digitalización formal del formato de WhatsApp para solicitar rollos de tela entre bodegas hermanas (Tototlán ➔ Zapopan).
  - **Componente de Requisiciones Inter-Compañía (`RequisicionesTelaresTab.tsx`):**
    - Listado con tarjetas ejecutivas que incluyen folio oficial (`REQ-TNT-2026-XXXX`), solicitante (Israel - Jefe de Almacén / Elba Vázquez - Compras), prioridad y ruta de camioneta asignada.
    - Stepper de seguimiento operativo en 3 etapas: *1. Requisición Solicitada* ➔ *2. En Ruta de Camioneta* ➔ *3. Recibida en Zapopan*.
    - Botón **"Copiar Ficha WhatsApp"** con mensaje enriquecido listo para compartir con el personal de bodega de Tototlán y choferes de camioneta.
    - Modal de **Vale de Carga de Camioneta** con desglose de partidas y firmas de entrega/recepción listo para imprimir.
    - Botones de acción directa: *Marcar en Ruta (Salió Camioneta)* y *Confirmar Entrada en Zapopan*.
  - **Modal de Creación de Requisiciones (`NuevaRequisicionTelaresModal.tsx`):**
    - Selector de solicitante (Israel, Elba, Andrea, Nayeli), turno de camioneta y prioridad de carga.
    - Buscador reactivo de SKUs con selección rápida e ingreso de rollos enteros (regla operativa de 50 metros estándar por rollo cerrado sin servicio de corte en Telares).
  - **Backend de Requisiciones Inter-Compañía (`purchasing.service.ts` & `purchasing.controller.ts`):**
    - Endpoints dedicados: `GET /purchasing/requisiciones-telares`, `POST /purchasing/requisiciones-telares` y `PUT /purchasing/requisiciones-telares/:id/status`.
    - Auto-creación y vinculación del proveedor interno `PROV-TNT` (*Telares y Tejidos / Rensselaer*).

## [1.4.4] - 2026-10-21

### Added
- **Rediseño Integral UX/UI de Tránsito Marítimo & Costeo (`TransitoPage.tsx`):**
  - **Diferenciación de Perfiles (ATC vs. Compras/Costeo):**
    - Enlace independiente en barra lateral (`Sidebar.tsx`): *En Tránsito (ATC)* (`/transito?view=atc`) con icono de barco, y *Tránsito & Costeo* (`/transito?view=costeo`) con icono de calculadora.
    - Soporte de conmutación reactiva de vistas con preservación de estado mediante `useSearchParams`.
    - Pestañas superiores de enfoque: *Vista Operativa ATC (Disponibilidad)*, *Vista Aduana & Costeo (Compras / Mane)*, y *Explorador por Tela en Tránsito*.
  - **Búsqueda Universal & Filtros Inteligentes:**
    - Barra de búsqueda unificada en tiempo real capaz de filtrar por código de embarque (`EMB-2026-0002`), contenedor SAT (`MSCU-...`), pedimento aduanal (`26 16...`), proveedor, transportista, y **telas/SKU o colores dentro del embarque** (`ENIGMA`, `LINO`, `NEGRO`, etc.).
    - Chips de filtrado rápido: *Todos*, *Arribo Inminente (< 5 días)*, *En Mar (5-14 días)*, *Alta Mar (> 14 días)*, *Con Metraje Libre*, y *100% Comprometidos*.
    - Selector de ordenamiento: por fecha estimada de arribo (ETA), mayor metraje total, mayor disponibilidad libre, o código alfabético.
  - **Inspección Profunda de Mercancía ("Qué hay dentro del embarque"):**
    - Desglose enriquecido de telas dentro de cada tarjeta con rollos, metraje total, metraje disponible p/ venta y metros reservados por clientes en backorder.
    - Enlace directo por partida: botón "Cotizar" (`/pedidos?newSku=...&shipmentId=...`) y botón "Ver en Disponibilidad 360°".
    - Acordeón inteligente para expandir/colapsar partidas cuando el contenedor tiene múltiples telas.
    - Modal ejecutivo de inspección profunda (*Packing List Oficial SAT 2026*) con tabla completa de partidas, rollos, clientes asignados y exportación/copia al portapapeles.
    - Botón de un solo clic para generar y copiar la ficha formateada para WhatsApp/Email de ATC.
- **Backend Enriquecido (`transit.service.ts`):**
  - Ampliación de la consulta `findAll` en `TransitService` para incluir datos técnicos completos del SKU (composición, ancho, peso, precio) y genealogía de reservas activas vinculadas a pedidos y clientes corporativos.

## [1.4.3] - 2026-10-21

### Added
- **Módulo de Disponibilidad Unificada 360° para ATC y Ventas (`DisponibilidadPage.tsx`):**
  - **Buscador en Vivo Debounced:** Filtrado dinámico a través de los 2,122+ SKUs del catálogo Formatex por código, nombre de tela y color (`mode: 'insensitive'`).
  - **Chips de Acceso Rápido:** Categorías top (`LENIGIRO`, `LINO`, `TERCIOPELO`, `BLACKOUT`, `JACQUARD`) para consulta ágil de telas insignia en mostrador y teléfono.
  - **Ficha Maestra Técnica de Tela:** Despliegue de especificaciones técnicas (ancho, peso, composición, proveedor) con acciones directas:
    - *Cotizar / Crear Pedido:* Redirección inmediata a `/pedidos?newSku=${skuId}` con apertura automática del modal de cotización pre-llenado.
    - *Copiar Ficha ATC:* Generador de texto corporativo formateado con stock físico, tránsito marítimo y precios para envío rápido por WhatsApp o correo.
  - **4 KPIs Ejecutivos con Barras Proporcionales:**
    - *Total Global Disponible:* Métricas consolidadas de stock físico libre y metros en tránsito marítimo, con barra visual comparativa física vs tránsito.
    - *Stock Físico Inmediato:* Rollos físicos en almacén, metros libres, apartados blandos 24h y apartados firmes.
    - *Contenedores en Tránsito:* Metros totales en tránsito, metros comprometidos en backorder y disponibilidad remanente.
    - *Precio Referencia & Listas:* Rango comercial F1-F10 y costo unitario.
  - **3 Pestañas Interactivas de Detalle Operativo:**
    - *Rollos Físicos en Almacén:* Lista de Handling Units (HUs) con códigos de rollo, racks de ubicación, metraje exacto, grado de calidad (Primera/Segunda/Merma), estatus comercial y lote de proveedor.
    - *Contenedores en Tránsito:* Tarjetas de embarques con número de contenedor oficial SAT, pedimento aduanal, naviera/transportista, cuenta regresiva de días para arribo (ETA) y semáforo preventivo.
    - *Matriz Oficial de Precios:* Despliegue de las 10 listas oficiales Formatex (F1 a F10) con calculadora interactiva de cotización en tiempo real según volumen (Rollo $\ge 50$m vs Corte $< 50$m) y desglose de IVA.
- **Backend Enriquecido (`reservations.service.ts`):**
  - Enriquecimiento del método `getAvailability(skuId)` en `ReservationsService` para devolver la entidad completa del SKU con sus listas de precios asociadas, metadatos del proveedor, detalle de HUs con tipo de ubicación y calidad, y datos aduanales del embarque (contenedor, pedimento, OC).
- **Integración Fluida de Creación de Pedidos (`PedidosPage.tsx`):**
  - Integración del hook `useSearchParams` para detectar `?newSku=...`, pre-poblando la línea de partida con la tela consultada y abriendo el modal de cotización de forma instantánea.

## [1.4.2] - 2026-10-21

### Added
- **Padrón de Agentes Oficiales de Ventas & Vinculación de Cartera:**
  - Alta en base de datos de los 5 agentes de ventas oficiales extraídos de `CARTERA PRUEBA PRECIOS ESP.xlsx`:
    - `VEND-LJR`: Luis Javier Robledo (`luis.robledo@formatex.mx`)
    - `VEND-GNA`: Gabriel Navarro Aguilar (`gabriel.navarro@formatex.mx`)
    - `VEND-JPH`: Juan Pablo Hernández Ríos (`juanpablo.hernandez@formatex.mx`)
    - `VEND-JMC`: Juan Manuel Casillas López (`juanmanuel.casillas@formatex.mx`)
    - `VEND-AVR`: Andrea Verónica Robles Ruvalcaba (`andrea.robles@formatex.mx`)
  - Vinculación de los 21 clientes clave a su respectivo agente de ventas (`Client.vendorId`), habilitando trazabilidad de comisiones y atención personalizada.
- **Registro Formal de Bodega Empresa Hermana (Telares y Tejidos):**
  - Alta en el modelo `Warehouse` de la bodega hermana `BOD-TNT` (*Bodega Telares y Tejidos / Río Tototlán / Rensselaer*) para soportar traspasos digitales de stock intercompañía.
- **Acceso & Roles Especializados de Compras e Importaciones:**
  - Usuarios operativos para el equipo de importaciones creados en base de datos: `elba.compras` (Elba Vázquez — Jefa de Compras & Costeo) y `mane.import` (Mane Gómez — Importaciones & Tráfico Aduanal Manzanillo) bajo rol `DIRECTOR_COMPRAS`.
  - Reestructuración de la barra de navegación lateral (`Sidebar.tsx`) agrupando la sección **Compras & Importaciones** con accesos directos a *Órdenes de Compra* (`/compras`), *Tránsito & Costeo* (`/transito`), y *Plan de Resurtido* (`/planificacion`).
  - Redirección automática en `Login.tsx` hacia `/transito` para roles de compras e importaciones.

## [1.4.1] - 2026-10-21

### Added
- **Consolidación Sesión #2 ATC & Operaciones (21 de Octubre de 2026 - Andrea Ramírez & Santiago):**
  - **Especificación Oficial de Reglas de Negocio v1.1:**
    - Actualización integral de `REGLAS_DE_NEGOCIO_ATC_FORMATEX.md` incorporando las Reglas 8 a 13.
    - Generación corporativa del documento Word ejecutivo `REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx` con tablas de autorizaciones, notas vinculantes y 4 firmas de conformidad.
    - *Regla 8 (Matriz de Días de Entrega):* Configuración por cliente de días autorizados de recepción (`Lun`-`Sáb`) y candado de retención física `Bodega en Espera de Ruta` cuando un pedido concluye fuera de día o corte.
    - *Regla 9 (Flota Propia & Drive In):* Gestión de 8 camionetas propias y rutas programadas, formalizando la política de corte para la Ruta Ocotlán (exclusiva Martes y Jueves).
    - *Regla 10 (E-Commerce Web Shopify):* Canal minorista en una sola exhibición gestionado por Nayeli bajo lista `F10` y cotizaciones internacionales vía Luis Javier.
    - *Regla 11 (Muestras como Producto Terminado):* Muestrarios y carpetas de tela configurados como unidad `PZA` sin cálculo de corte ni merma de rollo.
    - *Regla 12 (Traspasos Digitales Telares ↔ Formatex):* Reconocimiento de sinergia inter-empresa ("mismo dueño / se pagan y se dan el vuelto") y sustitución de capturas informales de WhatsApp por órdenes digitales de traspaso con auditoría.
    - *Regla 13 (Candado Estricto de Precios):* Bloqueo infranqueable de edición manual en captura de pedidos para blindar a la empresa contra pérdidas comerciales.
- **Frontend UI - Matriz de Recepción y Rutas Programadas (`CatalogosPage.tsx`):**
  - Selector interactivo de días de recepción (`[Lun] [Mar] [Mié] [Jue] [Vie] [Sáb]`) con atajos (`Lun-Vie`, `Mar/Jue Ocotlán`, `Lun/Mié/Vie`).
  - Asignación de ruta de entrega de flota propia (GDL/Zapopan, Tlaquepaque/Tonalá, Ocotlán Mar/Jue, Fletera Foránea, Mostrador).
  - Presets de ventanas horarias (`09:00 a 14:00`, `09:00 a 17:00`, `09:00 a 18:00`, `Personalizado`).
  - Tarjetas de domicilio con badges visuales de ruta, días permitidos y alerta preventiva de retención en rampa.
- **Frontend UI - Bloqueo de Precios y Soporte de Muestras PZA (`OrderLineSmart.tsx`):**
  - Candado visual y operativo de precio unitario (`disabled` / `readOnly` con indicador 🔒) ante listas oficiales o convenios directivos.
  - Conmutación automática a `Piezas (PZA)` y `$/PZA` para muestrarios, carpetas y libros, deshabilitando sugerencia de corte de rollo y desplegando banner informativo.

## [1.4.0] - 2026-10-21

### Added
- **Ingesta Masiva de Datos Oficiales Formatex (`Documentacion_recibida`):**
  - Carga y sincronización de **1,499 SKUs de tela** en `SkuMaster` con especificaciones técnicas, metrajes estándar y códigos comerciales.
  - Registro de **12,386 precios oficiales** en el nuevo modelo `SkuPriceList` cubriendo las 11 listas de precios (`F0` a `F10`).
  - Padrón activo de **27 clientes corporativos** con RFC verificado, domicilios fiscales y clasificación `tipoCliente` (`PG`, `CD`, `T`, `XT`, `F`, `XF`, `D`, `P`, `CE`).
  - Alta de **306 convenios de Precios Especiales Directivos** (`ClientSpecialPrice`) con tarifas fijas protegidas para cuentas clave (7 Days Muebles, Almacenes Camarena, red Muebles Plasencia / In and Out).
- **Motor Inteligente de Precios y Matriz Oficial Rollo vs. Corte (`LISTAS DE PRECIOS ACTUALES.png`):**
  - Implementación en `CatalogService.resolvePrice` y endpoint `/catalog/pricing/resolve`:
    - *Jerarquía de Precios:* Precio Especial Directivo (`ClientSpecialPrice`) > Matriz Oficial Rollo/Corte > Fallback precio referencia.
    - *Regla Rollo vs Corte:* Pedidos $\ge 50$m o rollo completo asignan lista de Rollo; pedidos $< 50$m asignan lista de Corte.
    - *Mapeo por Tipo de Cliente:* PG (F0/F1), CD (F2/F3), T (F3/F2), XT (F4/F3), F (F5/F3), XF (F5/F4), D (F6/F7), P (F8/F9), CE (F10).
    - *Candados Gerenciales:* Detección automática de listas que requieren autorización de Dirección General (`F3`, `F5`, `F7`, `F9`).
  - Rediseño de `OrderLineSmart.tsx`: visualización de precios reales en moneda nacional para cada lista, badges de "Tarifa Protegida por Dirección" y alertas preventivas de candado gerencial.
- **Generador de Packing List Oficial Formatex (`PackingSlipModal.tsx`):**
  - Estandarización idéntica al layout corporativo de Formatex (`FORMATO DE PAKING CLIENTE HAUS / ARMONY`):
    - Membrete legal: FORMA TEXTIL S. DE R.L. DE C.V., RFC `FTE140429FP3`, Rio La Barca 1680, CP 44870, Guadalajara, Jalisco, Tel: (33) 3650-5447.
    - Desacoplamiento de Destinatario Fiscal vs. Domicilio de Entrega / Receptor en Destino.
    - Parámetros logísticos: Fletera (Travisa, Castores, Tres Guerras), Seguro de Carga (Asegurado vs Sin Seguro), Tipo de Entrega (Domicilio por Cobrar) y Valor Declarado.
    - Desglose individual de rollos asignados (HUs con metraje individual por rollo) y clave SAT `11161800` (Tejidos Sintéticos).
    - Bloque de 3 firmas de control: Almacén Formatex (Preparó), Transportista/Fletera (Placas) y Recibido Conforme Cliente.
    - Estilos nativos para impresión y guardado como PDF (`@media print`) integrados en `PedidosPage` y `EmpaquePage`.
- **Módulo de Costeo de Importación & Exportador a CONTPAQi (Fórmula Oficial Elba):**
  - Implementación en `TransitService`, `TransitController` y `TransitoPage`:
    - Algoritmo de Landed Cost: $\text{Costo TT} = (\text{FOB USD} \times \text{TC Pedimento}) \times (1 + \% \text{Gastos } 23\%)$.
    - Factor de transferencia inter-empresa: $\text{Costo FM} = \text{Costo TT} / 0.88$ (12% de margen protegido Telares $\to$ Formatex).
    - Persistencia en base de datos (`IncomingShipment`) y actualización automática en cascada de `costoPuestoMexicoMXN` en `SkuMaster`.
    - Modal interactivo con recálculo dinámico de Tipo de Cambio, Número de Pedimento y % de Gastos Incrementables.
    - Exportación con un solo clic al formato de **Hoja Electrónica de CONTPAQi Comercial** en formato CSV (Producto, Lote, Metros, Costo Unitario, Pedimento SAT `26 16 1924 6003496`, fechas de fabricación y caducidad).

## [1.3.0] - 2026-10-21

### Added
- **Levantamiento y Estandarización de Compras Internacionales e Importaciones:** Integración formal de la sesión operativa sostenida con Elba (Compras e Importaciones Formatex / Telares y Tejidos), Mane (Importaciones) y Andrea Ramírez (Operaciones/ATC).
- **Especificación de Reglas de Negocio Inter-Compañía (Telares y Tejidos ↔ Formatex):**
  - *Arquitectura Inter-Empresa:* Separación de roles donde Telares y Tejidos (TNT) figura como importadora oficial en aduana y almacén de custodia matriz (Bodega Rensselaer), y Formatex opera como comercializadora bajo demanda diaria.
  - *Ciclo de Compras Internacionales a China:* Frecuencia semanal (1 orden/semana) detonada por directiva de Dirección (Ricardo), con tiempos de fabricación de 4 a 8 semanas y embarques marítimos de 600 a 900 rollos hacia Manzanillo.
  - *Homologación de Catálogo (Código/Nombre Chino vs. Nombre Comercial):* Estructuración de equivalencias en `SkuMaster` (`codigoChina`/`nombreChino` vs. `nombreComercial`) para eliminar cruces manuales en Excel.
  - *Doble Costeo y Divisas:* Registro dual de Costo FOB en USD (`costoOrigenUSD`) y Costo Puesto en México en MXN (`costoPuestoMexicoMXN` / Landed Cost).
  - *Regla Crítica de Tipo de Cambio Histórico:* Anclaje permanente del costeo en moneda nacional al Tipo de Cambio Oficial del Pedimento liquidado ante el SAT en la fecha de despacho, prohibiendo el recálculo con tasas flotantes del día de la consulta.
  - *Flujo de Reposición Inter-Bodegas:* Consolidado diario matutino (5 a 6 pedidos/semana) y traspasos exprés vespertinos desde un rollo individual, coordinados operativamente con Almacén (Israel).
  - *Facturación Inter-Compañía y Regla de Margen:* Margen de 7% a 12% entre empresas, adoptando la regla del costo más alto de los últimos embarques recibidos para blindar el margen ante volatilidad logística.
  - *Integración con ATC y Disponibilidad Neta:* Visibilidad unificada de Stock Formatex, Stock Telares (24h) y Tránsito Marítimo, descontando rigurosamente apartados (72h) y backorders FIFO de otros clientes.
- **Entregables y Memoria Técnica Formal en [`requerimientos/compras_importaciones/`](file:///Users/jonathanpalacios/Downloads/wms-formatex-v2/requerimientos/compras_importaciones/):**
  - `REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.docx`: Documento ejecutivo en Word con diseño corporativo, callouts de reglas críticas, tabla de compromisos y bloque de firmas de 5 participantes (Elba, Mane, Andrea Ramírez, Ricardo Zerpa, Jonathan Palacios).
  - `REGLAS_DE_NEGOCIO_COMPRAS_IMPORTACIONES_FORMATEX.md`: Versión completa en Markdown para control de cambios.
  - `CORREO_RESUMEN_ELBA_COMPRAS_IMPORTACIONES.md`: Minuta ejecutiva para envío a Elba, Mane y Andrea con la solicitud de archivos muestra de costeo, órdenes y catálogos.

### Fixed
- **Vercel Build Error en `PedidosPage.tsx`:**
  - Corrección de expresión JSX condicional no cerrada (`{deliveryModalOrder && (` faltaba `)}` en línea 1888), resolviendo el fallo de compilación de Vite en despliegues de Preview en la rama `dev`.

## [1.2.0] - 2026-10-15

### Added
- **Levantamiento y Estandarización de Atención al Cliente (ATC) & Ventas:** Integración formal del flujo operativo consensuado en sesión de trabajo con Alma (Jefatura ATC) y Andrea Ramírez (Operaciones/ATC Formatex).
- **Motor de Backorders ("BARCORDE") & Asignación Marítima FIFO:**
  - Identificación de pedidos respaldados por mercancía en tránsito marítimo o programada en bodega de telares (`esBackorder`, `backorderStatus`).
  - Asignación secuencial estricta de posición en cola de espera FIFO (`posicionCola = #1, #2, #3...`) por contenedor y SKU.
  - Recorrido automático en cascada: al cancelar o ceder metraje un cliente, la cola retrocede automáticamente (`posicionCola - 1`) y reasigna los rollos liberados al siguiente comprador en espera o promovido desde contenedores futuros.
  - Asociación directa con el embarque y contenedor (`numeroContenedor`, `fechaEstimadaArriboContenedor`, `fechaCapturaPedido`).
- **Los 3 Formatos Oficiales de Cotización y Cobro en Backorder:**
  - *Contado con Anticipo:* Pago adelantado para asegurar y congelar metraje del contenedor; ajuste de diferencia al arribar y medir los rollos.
  - *Contado al Arribo (Cierre Fiscal):* Formado en cola sin cobro previo; liquidación y timbrado de factura sincronizados en el mismo mes calendario del arribo a bodega.
  - *Crédito Comercial:* Asignación en cola y surtido directo contra línea de crédito autorizada al arribo tras validar la OC.
- **Motor de Semáforos y Alertas Preventivas de Contenedores:**
  - *Alerta 15 Días Previos al ETA (`AMBAR_15D`):* Tarea preventiva para que ATC contacte al cliente vía telefónica o WhatsApp para revalidar la vigencia de la Orden de Compra antes del arribo.
  - *Alerta 5 Días Previos al ETA (`ROJO_5D`):* Alerta de arribo inminente a puerto/bodega para programar cobro o cargo a crédito y alistar maniobras de corte/despacho.
  - *Estatus `VERDE` (> 15 días) y `VENCIDO`:* Clasificación visual dinámica del estado del tránsito.
  - Endpoints de backend: `GET /orders/backorder/containers`, `GET /orders/backorder/queue`, `PUT /orders/:id/backorder/confirm-vigencia`, `POST /orders/:id/backorder/cancel-and-reassign`.
- **Estructura Multi-Domicilio para Clientes (`ClientAddress`):**
  - Registro de N domicilios por cliente (matriz fiscal y destinos alternos de entrega: sucursales, bodegas y talleres de tapicería externa como Plasencia/Punto Sur).
  - Campos detallados: `alias`, `tipo`, `calleNumero`, `colonia`, `municipio`, `estado`, `cp`, `contactoNombre`, `contactoTelefono`, `horarioRecepcion` y `esPredeterminada`.
- **Tarea Preventiva de Validación Logística en Surtido:**
  - Disparador automático: al transicionar un pedido al estado `EN_SURTIDO`, se genera una tarea prioritaria para el ATC creador y la supervisora Alma para ratificar destino exacto, receptor, teléfono, horario de descarga, fletera y seguro de carga antes de que empaque embale los rollos.
  - Modal integrado en pedidos y banner superior con conteo de pedidos pendientes de validación.
- **Matriz Centralizada de Precios Especiales (`ClientSpecialPrice`):**
  - Modelo en base de datos para registrar acuerdos de Dirección General por dupla `Cliente + SKU` (ej. tapiceros de cadenas muebleras).
  - Auto-detección en cotización: al ingresar cliente y tela, el WMS inserta el precio neto acordado, bloquea el campo de precio para evitar errores de dedo y coloca distintivo de auditoría.
- **Catálogo de las 10 Listas Oficiales de Precios Formatex & Candados de Modificación:**
  - Homologación de F1 a F10: *F1 Casa Decoradora, F2 Tienda, F3 Tienda Especial, F4 Fabricante, F5 Fabricante Especial, F6 Distribuidor, F7 Distribuidor Especial, F8 Cliente Premium, F9 Precio Dirección / Mayorista, F10 Venta Web*.
  - Candado de seguridad: listas especiales (`F3`, `F5`, `F7`, `F9`) requieren autorización gerencial en sistema (`requiereAprobacion = true`). Si un agente intenta asignar una lista inferior en una cotización, el pedido entra en `REQUIERE_AUTORIZACION` requiriendo aprobación de Supervisora Alma.
- **Privacidad Estricta de Comisiones y Márgenes:**
  - Ocultamiento de porcentajes de comisión de vendedores (ej. 2.25%) y márgenes brutos en interfaces operativas de ATC y vendedores. Únicamente se expone el precio neto por metro ($/m). Visibilidad restringida a roles `ADMIN` y `GERENCIA`.
- **Políticas de Apartado y Doble Ventana de Tiempo (24h vs. 72h):**
  - Sustitución oficial del concepto técnico "Reserva Blanda" por el término comercial **"Apartado"**.
  - Ventana comercial comunicada al cliente de **24 horas** para forzar celeridad en el pago.
  - Ventana operativa interna en almacén de **72 horas (3 días)** para proteger los rollos ante los ciclos de pago corporativos en viernes.
  - Eliminación de opciones obsoletas de 7 días (168h) y 14 días (336h).
- **Entregables y Memoria Técnica Formal en [`requerimientos/atencion_al_cliente/`](file:///Users/jonathanpalacios/Downloads/wms-formatex-v2/requerimientos/atencion_al_cliente/):**
  - `REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx`: Documento ejecutivo en Word con diseño corporativo, tablas de listas de precios y bloque de 4 firmas de conformidad vinculantes (Alma, Andrea Ramírez, Ricardo Zerpa, Jonathan Palacios).
  - `REGLAS_DE_NEGOCIO_ATC_FORMATEX.md`: Versión Markdown completa para seguimiento de cambios.
  - `CORREO_RESUMEN_ALMA_Y_ANDREA.md`: Plantilla ejecutiva del correo formal para envío de minuta y solicitud de insumos pendientes.
- **Cumplimiento Estricto de Branding:** Erradicación total de emojis genéricos en componentes modificados (`PedidosPage.tsx`, badges y toasts), reemplazados por componentes tipados de `WmsIcon` y `lucide-react` con diseño Tailwind profesional.

### Changed
- `wms-backend/prisma/schema.prisma`:
  - Nuevos modelos `ClientAddress` y `ClientSpecialPrice`.
  - Ampliación de `PriceListConfig` con flags `requiereAprobacion` y `rolMinimoAprobador`.
  - Ampliación de `Order` con campos logísticos (`deliveryAddressId`, `deliveryContactName`, `deliveryContactPhone`, `deliverySchedule`, `fletera`, `envioAsegurado`, `deliveryConfirmed`, `deliveryConfirmedAt`, `deliveryConfirmedBy`, `notasEntrega`) y campos de backorder (`esBackorder`, `backorderStatus`, `condicionBackorder`, `contenedorNumero`, `fechaEstimadaArriboContenedor`, `posicionCola`, `incomingShipmentId`, `notificado15DiasAt`, `notificado5DiasAt`, `vigenciaConfirmadaAt`, `vigenciaConfirmadaPor`).
  - Ampliación de `IncomingShipment` con `numeroContenedor` y relación `orders Order[]`.
- `wms-backend/prisma/migrations/20261015010000_add_backorder_queue_and_containers/migration.sql`:
  - Migración SQL creada y aplicada directamente al pooler PostgreSQL de Supabase.
- `wms-backend/src/modules/orders/orders.service.ts` & `orders.controller.ts`:
  - Lógica de creación de backorder, conteo FIFO, validación de vigencia y reasignación en cascada.
  - Endpoints de confirmaciones pendientes de entrega asignados a ATC y supervisores.
- `wms-frontend/src/pages/orders/PedidosPage.tsx`:
  - Segmented control con pestañas *Flujo Operativo (Pipeline)* y *Cola de Backorders (Tránsito / Telar)*.
  - Guía operativa Formatex explicando la regla de 15 días, 5 días y recorrido FIFO.
  - Selector de contenedores activos con métricas de arribo y filtro en vivo.
  - Tabla de cola de espera con turnos destacados (`#1`, `#2`), semáforos visuales de arribo y botones de confirmación de vigencia o cancelación.
  - Modal de gestión de backorders para captura de notas de revalidación o cancelación con aviso de recorrido automático de cola.
  - Sustitución de señalética informal por badges con microanimación de pulso institucional.

---

## [1.1.0] - 2026-10-02
- **Motor de Planificación y Resurtido Formatex:** Implementación completa de la fórmula del Master de Andrea y Ricardo: cruce de lo que TENDREMOS ($S+P+T$ = Stock Nave + Stock Almacén 9 + Compras en Tránsito con ETA) contra lo que NECESITAREMOS ($4M \text{ Promedio} \times 4.5$ o Demanda Comprometida), dictamen de estatus (`OK` vs. `RESURTIR`) y cálculo de sugerencia en rollos enteros estándar.
- **Ajuste Ricardo (Dirección):** Campo de captura y endpoint directo (`PATCH /supply-planning/lines/:id/ajuste-direccion`) para registrar la decisión final de Ricardo sobre el pedido sugerido, utilizable al generar la Orden de Compra.
- **Ingesta Masiva de Facturación (CFDI 4.0 XML & CONTPAQi):** Parser nativo de facturas electrónicas de venta XML emitidas por CONTPAQi o buzón SAT, extrayendo fecha, código de SKU y metros facturados para alimentar el histórico mensual sin captura manual.
- **Matriz Histórica de 13 Meses (`SkuSalesHistory`):** Modelo en Prisma y vista matricial mes a mes de los últimos 13 meses de ventas por SKU con capacidad de edición manual rápida y recálculo automático de promedios.
- **Clasificación de Calidad por Rollo:** Grados de calidad asignables por HU (`PRIMERA`, `CALIDAD_A`, `CALIDAD_B (-20%)`, `CALIDAD_C (-40%)`, `CALIDAD_D (-60%)`).
- **Bloqueo Comercial / Restringido:** Estatus `calidadRestringida` con aislamiento operativo total; el motor de corte y surtido (`suggestHUs`) descarta automáticamente cualquier rollo restringido o de calidad diferente a Primera.
- **Muestrarios y Libros de Colección (`PZA`):** Soporte en catálogo maestro para SKUs de tipo `MUESTRARIO` con unidad de medida en piezas (`PZA`) y asociación de colección/libro (`libroColeccion`).
- **Guía de Validación Operativa:** Archivo `GUIA_VALIDACION_WMS_FORMATEX.md` con credenciales demo, URLs, casos de prueba y datos de entrada para los 5 pilares clave.
- **Actualización de Alcance Contractual:** Adenda técnica formalizada en `SOW_WMS360_Formatex_MovidaTCI_v1.0.docx` (Versión 1.1).

### Changed
- `wms-backend/prisma/schema.prisma`:
  - Modelo `SkuMaster`: nuevos campos `libroColeccion` (String?) y `tipoArticulo` (String default "TELA").
  - Modelo `HandlingUnit`: nuevos campos `gradoCalidad` (String default "PRIMERA") y `calidadRestringida` (Boolean default false) con índice para filtrado rápido.
  - Modelo `SupplyPlanLine`: campos `promedio4M`, `proyeccion4M5`, `decisionStatus` ("OK" | "RESURTIR") y `ajusteDireccion`.
  - Nuevo modelo `SkuSalesHistory` con clave única compuesta `@@unique([skuId, anio, mes])`.
- `wms-frontend/src/pages/planning/PlanificacionPage.tsx`:
  - Pestañas dobles: *Plan de Abastecimiento & Resurtido (Master)* e *Histórico 13 Meses (CONTPAQi / SAT)*.
  - Columnas Formatex: *Tendremos (S+P+T)*, *4M Prom Vta*, *Proy 4.5M*, *Estatus Decisión* y *Ajuste Ricardo* con guardado inline.
  - Modal de carga masiva de archivos XML (CFDI 4.0).
- `wms-frontend/src/pages/inventory/RollosPage.tsx`:
  - Badges visuales de calidad por grado.
  - Selector de calidad y bloqueo en panel lateral con actualización instantánea vía `PUT /inventory/hus/:id/calidad`.
  - Filtro desplegable por grado y por disponibilidad comercial.
- `wms-frontend/src/pages/catalog/CatalogosPage.tsx`:
  - Soporte para creación de artículos tipo `MUESTRARIO` / `LIBRO` en `PZA`.
  - Columnas de colección y badges distintivos en tabla de SKUs.

---

## [1.0.0] - 2026-05-04

### Added
- Release inicial de WMS 360+ Formatex para FORMA TEXTIL S. DE R.L. DE C.V.
- Arquitectura monorepo con NestJS 11 backend y React 19 + Vite 8 frontend.
- Gestión de inventario centrada en HUs (rollos enteros y retazos) con trazabilidad genealógica de corte.
- Ciclo de vida de pedidos en 9 estados con validación de cobranza, reservas blandas/firmes y timbrado CFDI 4.0 vía Facturapi.
- Aplicación web progresiva (PWA) optimizada para terminales portátiles Zebra TC22 con escaneo de código de barras.
- Despliegue en la nube en Render (backend API) y Vercel (frontend SPA) con base de datos PostgreSQL en Supabase.
