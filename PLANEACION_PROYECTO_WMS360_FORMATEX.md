# 📋 Plan Maestro de Proyecto: WMS 360+ Formatex
## Estrategia Integral de Revalidación Funcional, Desarrollo e Implementación en Bodega
**Cliente:** FORMA TEXTIL S. DE R.L. DE C.V. (Formatextil) — Guadalajara, Jalisco  
**Proveedor / Consultoría:** MOVIDA TCI LLC  
**Líder de Proyecto Técnico:** Jonathan Palacios  
**Líder de Proyecto Cliente:** Andrea / Equipo Directivo Formatex  
**Código del SOW:** MOV-WMS360-Formatex v1.0 (Revisión v1.1 Octubre 2026)  
**Duración Total:** 6 Meses Calendario (24 Semanas continuas)  
**Presupuesto SOW:** $290,000.00 MXN + IVA (5 Hitos de Pago)  
**Fecha de Emisión:** Octubre 2026  

---

## 📑 Índice
1. [Resumen Ejecutivo y Objetivos](#1-resumen-ejecutivo-y-objetivos)
2. [Estrategia y Rol del Prototipo Visual Interactivo](#2-estrategia-y-rol-del-prototipo-visual-interactivo)
3. [Estructura en Dos Grandes Bloques (6 Meses / 24 Semanas)](#3-estructura-en-dos-grandes-bloques-6-meses--24-semanas)
4. [Programa Detallado de Entrevistas por Videollamada (5 Áreas)](#4-programa-detallado-de-entrevistas-por-videollamada-5-áreas)
5. [Cronograma Maestro Semana a Semana (24 Semanas)](#5-cronograma-maestro-semana-a-semana-24-semanas)
6. [Estrategia de Arranque en Frío "Cero Paros" (Nave Atlas)](#6-estrategia-de-arranque-en-frío-cero-paros-nave-atlas)
7. [Matriz RACI de Roles y Responsabilidades](#7-matriz-raci-de-roles-y-responsabilidades)
8. [Matriz de Pruebas de Aceptación de Usuario (UAT) y Salida a Producción](#8-matriz-de-pruebas-de-aceptación-de-usuario-uat-y-salida-a-producción)
9. [Estructura de Inversión y Condiciones de Pago por Hito](#9-estructura-de-inversión-y-condiciones-de-pago-por-hito)
10. [Archivos y Herramientas Entregables](#10-archivos-y-herramientas-entregables)

---

## 1. Resumen Ejecutivo y Objetivos

El presente documento establece la **Planeación Maestra del Proyecto WMS 360+** para **FORMA TEXTIL S. DE R.L. DE C.V. (Formatextil)**, en estricta consonancia con el *Statement of Work (SOW)* código `MOV-WMS360-Formatex v1.0`.

La distribución mayorista de telas en Guadalajara enfrenta particularidades físicas y comerciales que desaconsejan el uso de sistemas ERP genéricos:
* El producto es **continuo y variable**: los rollos no tienen unidades discretas uniformes, sino metrajes reales oscilantes (ej. 48.5m, 51.2m, 62m).
* El proceso comercial depende de **cortes continuos**: cada corte divide un rollo padre en un rollo para el cliente y un "retazo vivo" que debe conservar su trazabilidad, metraje e historial.
* La nave operativa principal (**Nave Atlas**) cuenta con racks industriales de 5 a 6 niveles (con zonificación vertical requerida entre picking a pie y stock de altura para montacargas), mesas de corte con máquinas enrolladoras mecánicas con contadores (`MESA 2`, `MESA 3`, `MESA 5`) y carros de recolección rodantes ("burros" metálicos).
* No es viable un corte abrupto de operaciones ("Big Bang"); Formatex no puede detener un solo día sus despachos ni ventas.

### Objetivos Clave del Proyecto
1. **Digitalizar y controlar el 100% del inventario por Unidades de Manipulación (HU)** con etiquetado térmico por rollo.
2. **Revalidar los requerimientos de 5 áreas clave** (Almacén, ATC, Facturación, Compras y Planeación) mediante videollamadas guiadas sobre pantallas interactivas.
3. **Desarrollar y afinar en 3 meses** la plataforma WMS (Web Administrativa, Backend NestJS, Base de Datos Supabase/PostgreSQL y PWA para Zebra TC22).
4. **Implementar en 3 meses en bodega real** la infraestructura de Nave Atlas, capacitar operadores y desplegar una estrategia de convivencia ("Zona Blanca vs Zona Gris") con cero paros operativos.
5. **Certificar la solución mediante UAT formal** y culminar con la salida oficial a producción (Go-Live).

---

## 2. Estrategia y Rol del Prototipo Visual Interactivo

> [!IMPORTANT]
> **Narrativa Estratégica para el Cliente:**
> A fin de garantizar la viabilidad técnica y eliminar cualquier riesgo de desalineación en requerimientos complejos antes de comprometer fechas y recursos de Formatex, **el equipo de Movida TCI preparó proactivamente un prototipo visual interactivo de alta fidelidad**.

Para el cliente y la directiva de Formatex, este trabajo previo cumple tres funciones estratégicas fundamentales:
1. **Evidencia Tangible de Viabilidad:** Demuestra a la dirección que los retos específicos de su operación (árboles genealógicos de corte, calidades A-D, bloqueo de rollos con tara, reservas de ATC y timbrado CFDI 4.0) tienen solución técnica comprobada.
2. **Acelerador de las Entrevistas de Descubrimiento:** En lugar de realizar sesiones teóricas aburridas donde los usuarios tratan de imaginar el sistema sobre un papel, las videollamadas con los jefes de departamento serán **sesiones interactivas** donde se navega el prototipo, se prueba la usabilidad y se ajustan los flujos a la realidad diaria.
3. **Garantía de Cero Reprocesos:** Al validar visualmente la experiencia de usuario (UX) y los campos necesarios antes de cerrar la especificación funcional, el desarrollo de código en los primeros 3 meses avanza con precisión quirúrgica sin retrabajos.

---

## 3. Estructura en Dos Grandes Bloques (6 Meses / 24 Semanas)

El proyecto comprende un ciclo integral de **24 semanas continuas (6 meses calendario)**, dividido en dos grandes bloques de 12 semanas cada uno:

```
┌────────────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
│        BLOQUE 1: MESES 1 A 3 (SEMANAS 01 A 12)         │  │        BLOQUE 2: MESES 4 A 6 (SEMANAS 13 A 24)         │
├────────────────────────────────────────────────────────┤  ├────────────────────────────────────────────────────────┤
│ • Revalidación con 5 Áreas por Videollamada.           │  │ • Equipamiento Físico en Nave Atlas (Zebra TC22/Wi-Fi).│
│ • Demostración sobre Prototipo y Firma de Actas.       │  │ • Rotulación de Pasillos, Racks y Niveles 1 al 6.      │
│ • Arquitectura Backend NestJS y Base de Datos (36 mod).│  │ • Migración de Datos Maestros e Histórico CONTPAQi.    │
│ • Frontend Web React/Vite y PWA Móvil Zebra TC22.      │  │ • Arranque en Frío Cero Paros (Zona Blanca vs Gris).   │
│ • Motor de Resurtido Automatizado Formatex Master.     │  │ • Capacitación en Piso a Operadores y Administrativos. │
│ • Integración Fiscal CFDI 4.0 con CSFacturación.       │  │ • Pruebas Piloto en Vivo con Pedidos y Compras Reales. │
│ • Entregable: WMS Core 100% Funcional de Laboratorio.  │  │ • UAT Formal por Área, Go-Live Oficial e Hipercare.    │
└────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────────────┘
```

---

## 4. Programa Detallado de Entrevistas por Videollamada (5 Áreas)

Las entrevistas se llevarán a cabo en las **Semanas 1, 2 y 3** mediante videoconferencia (Google Meet o Zoom), con una duración de entre 60 y 90 minutos por sesión.

### 📦 Entrevista 1: Área de Almacén y Nave Atlas
* **Semana Programada:** Semanas 1 y 2 (Sesión de 90 minutos).
* **Participantes Convocados:**
  * *Formatex:* Jefe de Almacén, Encargado de Nave Atlas, Operador Líder de Mesas de Corte, Andrea (Líder Proyecto).
  * *Movida TCI:* Jonathan Palacios (Líder Técnico WMS).
* **Objetivo:** Revalidar el flujo físico de recepción de rollos, inspección visual, etiquetado térmico HU, zonificación vertical de Nave Atlas y operación en mesas de corte mecánicas.
* **Flujos del Prototipo a Demostrar:**
  * PWA Zebra TC22 (Escaneo de código de barras, interfaz táctil con guantes).
  * Pantalla de Recepción de Rollos (Metraje proveedor vs metraje real).
  * Visor de Slotting Nave Atlas (Pasillos 1-2, Racks 4-6, Niveles 1-2 picking vs Niveles 3-6 altura).
  * Pantalla táctil de Mesa de Corte (Mesa 2, 3, 5) con contador de metros.
* **Cuestionario y Temas Críticos a Validar:**
  1. *Cotejo en Recepción:* ¿Cómo reciben rollos actualmente? ¿Pesan, miden todos los rollos o hacen muestreo aleatorio?
  2. *Clasificación de Calidad:* ¿Bajo qué condiciones un rollo se clasifica en Calidad A, B, C, D o se marca como "Restringido / Con Tara"?
  3. *Zonificación Vertical:* ¿Se confirma que Niveles 1 y 2 son para picking manual a pie y Niveles 3 al 6 son de altura exclusivos para montacargas?
  4. *Mesas de Corte:* ¿Cómo interactúan los cortadores con las máquinas enrolladoras con contador mecánico? ¿Qué destino tienen los retazos vivos resultantes?
  5. *Batch Picking:* ¿Cómo se organizan los carros metálicos rodantes ("burros") para surtir 2 o 3 pedidos en una misma ruta de pasillo?
  6. *Convivencia Inicial:* ¿Están de acuerdo con el modelo de Zona Blanca (rollos con etiqueta WMS) y Zona Gris tradicional para no detener despachos?
* **Entregable de Cierre:** Acta de Acuerdos de Almacén, Matriz de Reglas de Corte y Layout Nave Atlas validado.

---

### 💬 Entrevista 2: Área de ATC (Atención a Clientes) y Ventas
* **Semana Programada:** Semana 2 (Sesión de 75 minutos).
* **Participantes Convocados:**
  * *Formatex:* Coordinador de ATC, Ejecutivos de Ventas Mayoreo, Andrea.
  * *Movida TCI:* Jonathan Palacios.
* **Objetivo:** Revalidar las políticas de consulta de stock disponible en tiempo real, reservas de pedidos, tolerancia de metraje en cortes y administración de muestrarios (libros de tela).
* **Flujos del Prototipo a Demostrar:**
  * Buscador rápido de telas por tipo, color y disponibilidad real.
  * Pantalla de Reserva de Pedidos (Reserva suave vs reserva firme).
  * Catálogo de Muestrarios / Libros de tela y control de préstamos.
  * Tablero de estatus de pedidos (En Cola, En Corte, Empacado, Listo para Entrega).
* **Cuestionario y Temas Críticos a Validar:**
  1. *Políticas de Reserva:* Cuando un cliente cotiza, ¿se aparta el rollo completo o metros específicos? ¿Cuánto tiempo permanece activa una reserva antes de liberarse automáticamente?
  2. *Tolerancia de Corte:* Si un cliente solicita 50 metros y el rollo más cercano tiene 53 metros, ¿se le propone facturar los 53 metros completos o se corta a 50 metros dejando 3 metros de retazo?
  3. *Venta de Calidades B y C:* ¿El equipo de ATC tiene autorización para ofrecer rollos con defectos menores a precios de descuento?
  4. *Catálogo de Muestrarios (Libros):* ¿Cómo se controlan los libros de muestras entregados a clientes mayoristas? ¿Debe el WMS descontar el metraje usado para armar muestrarios?
  5. *Visibilidad en Tiempo Real:* ¿Qué información del pedido necesita ver ATC para contestar llamadas de seguimiento sin interrumpir a los cortadores?
* **Entregable de Cierre:** Acta de Reglas Comerciales de Reserva, Política de Tolerancia de Cortes y Procedimiento de Muestrarios.

---

### 🧾 Entrevista 3: Área de Cobranza y Facturación
* **Semana Programada:** Semana 2 (Sesión de 75 minutos).
* **Participantes Convocados:**
  * *Formatex:* Contador General, Encargado de Facturación, Crédito y Cobranza, Andrea.
  * *Movida TCI:* Jonathan Palacios.
* **Objetivo:** Revalidar el momento exacto de timbrado fiscal CFDI 4.0, integración API con CSFacturación / Facturapi, políticas de crédito comercial y notas de crédito.
* **Flujos del Prototipo a Demostrar:**
  * Módulo de Facturación CFDI 4.0 integrado.
  * Bandeja de pedidos con corte confirmado listos para timbrado.
  * Descarga y previsualización de XML y PDF timbrados ante el SAT.
  * Validaciones de RFC, Régimen Fiscal, Uso de CFDI y Código Postal.
* **Cuestionario y Temas Críticos a Validar:**
  1. *Momento de Timbrado:* ¿El CFDI 4.0 se timbra antes de surtir o forzosamente después de que la mesa de corte confirma el metraje exacto despachado?
  2. *Remisiones vs Facturas Directas:* ¿Manejan clientes que operan bajo remisiones semanales y factura consolidada al cierre de mes?
  3. *Bloqueo por Crédito:* ¿El sistema debe impedir la liberación de pedidos hacia el almacén si el cliente presenta facturas vencidas o saldo excedido?
  4. *Actualización de Datos Fiscales:* ¿Quién es el responsable de mantener actualizados los datos de la Constancia de Situación Fiscal (CSF)?
  5. *Cancelaciones y Devoluciones:* ¿Cuál es el protocolo para notas de crédito en caso de rollos devueltos por discordancia de tono o defecto oculto?
* **Entregable de Cierre:** Flujograma de Timbrado Fiscal Aprobado, Esquema de Conexión CSFacturación y Reglas de Liberación por Crédito.

---

### 🚢 Entrevista 4: Área de Compras y Abastecimiento
* **Semana Programada:** Semana 3 (Sesión de 75 minutos).
* **Participantes Convocados:**
  * *Formatex:* Gerente de Compras, Auxiliar de Tráfico e Importaciones, Andrea.
  * *Movida TCI:* Jonathan Palacios.
* **Objetivo:** Revalidar el ciclo de órdenes de compra nacionales y de importación, seguimiento de contenedores en tránsito y cotejo físico contra factura del proveedor.
* **Flujos del Prototipo a Demostrar:**
  * Módulo de Creación y Seguimiento de Órdenes de Compra.
  * Tablero de Mercancía en Tránsito (Contenedores y barcos).
  * Pantalla de Recepción y Cotejo contra factura del proveedor.
* **Cuestionario y Temas Críticos a Validar:**
  1. *Origen de Mercancía:* ¿Qué proporción de compra es de proveedores nacionales vs contenedores marítimos de importación?
  2. *Seguimiento de Tránsito:* ¿Cómo registran hoy los contenedores que ya están en navegación o en trámite aduanal para sumarlos al inventario proyectado?
  3. *Mermas de Origen:* Si un proveedor factura 10,000 metros pero físicamente llegan 9,870 metros, ¿cómo se documenta y concilia la diferencia?
  4. *Catálogo de Telas y Proveedores:* ¿Los proveedores usan códigos estándar de tela/color o Formatex asigna sus propios nombres comerciales?
  5. *Costeo y Aranceles:* ¿El WMS solo controlará volúmenes físicos (metros/rollos) o requiere prorrateo de gastos de importación y fletes?
* **Entregable de Cierre:** Protocolo de Registro de Tránsito, Procedimiento de Cotejo Físico vs Factura y Catálogo de Proveedores Homologado.

---

### 📈 Entrevista 5: Área de Planeación, Resurtido y Forecasting
* **Semana Programada:** Semana 3 (Sesión de 75 minutos).
* **Participantes Convocados:**
  * *Formatex:* Director de Operaciones, Encargado de Planeación y Suministro, Andrea.
  * *Movida TCI:* Jonathan Palacios.
* **Objetivo:** Revalidar la formulación matemática del Motor de Resurtido Automatizado Formatex Master ($S+P+T$ vs Demanda Proyectada $4M \times 4.5$), ingesta de 13 meses de ventas CONTPAQi y categorización de telas.
* **Flujos del Prototipo a Demostrar:**
  * Panel de Resurtido Automatizado Formatex Master.
  * Simulador de Compras Sugeridas y Alertas de Quiebre de Stock.
  * Módulo de Ingesta y Análisis del Histórico de Ventas de 13 meses.
* **Cuestionario y Temas Críticos a Validar:**
  1. *Fórmula de Resurtido:* ¿Se ratifica la fórmula $S$ (Stock Actual) + $P$ (En Producción/OC) + $T$ (En Tránsito) comparado con el promedio mensual de ventas multiplicado por el factor de rotación deseado?
  2. *Segmentación de Telas:* ¿Se clasifican las telas en "Básicas Continuas" (consumo constante todo el año) vs "Telas de Temporada / Moda" (sin resurtido automático)?
  3. *Histórico CONTPAQi:* ¿Se tienen disponibles los archivos XML o reportes de ventas de los últimos 13 meses en CONTPAQi Comercial para alimentar el motor?
  4. *Periodicidad:* ¿Con qué periodicidad debe ejecutarse el cálculo de resurtido (semanal, quincenal, mensual)?
  5. *Flujo de Autorización:* ¿El motor genera órdenes de compra automáticas o un reporte de sugerencias en borrador para revisión humana?
* **Entregable de Cierre:** Especificación Paramétrica del Motor de Resurtido Aprobada y Calendario de Ingesta Histórica CONTPAQi.

---

## 5. Cronograma Maestro Semana a Semana (24 Semanas)

A continuación se detalla la matriz de actividades, responsables, plazos y estatus para las 24 semanas del proyecto:

| ID | Bloque / Mes | Módulo | Actividad / Entregable Específico | Área Involucrada | Responsable Principal | Semanas | Fechas Calendario Estimadas | Estatus | Entregable / Hito Vinculado |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **ACT-01** | Mes 1 | Gobernanza | Kickoff formal del proyecto, firma de SOW y liquidación de Anticipo | Dirección / Andrea | Formatex & Movida TCI | W01 | 26/10/26 - 30/10/26 | **Hito de Pago** | SOW firmado y anticipo (Hito 1: $52,000 + IVA) |
| **ACT-02** | Mes 1 | Entrevistas | Entrevista 1 (Almacén): Recepción rollos, calidades A-D, etiquetado HU y Nave Atlas | Almacén | Movida TCI & Jefe Almacén | W01-W02 | 26/10/26 - 06/11/26 | **En Curso** | Acta de acuerdos de almacén y layout Nave Atlas |
| **ACT-03** | Mes 1 | Entrevistas | Entrevista 2 (ATC / Ventas): Reserva inventario, tolerancia corte y muestrarios | ATC / Ventas | Movida TCI & Líder ATC | W02 | 02/11/26 - 06/11/26 | Planificado | Matriz de reglas de reserva y muestrarios |
| **ACT-04** | Mes 1 | Entrevistas | Entrevista 3 (Cobranza / Fact.): CFDI 4.0, remisiones vs facturas y CSFacturación | Facturación | Movida TCI & Contador | W02 | 02/11/26 - 06/11/26 | Planificado | Flujo de timbrado fiscal y validación de corte |
| **ACT-05** | Mes 1 | Entrevistas | Entrevista 4 (Compras): OC nacionales/importación, contenedores y cotejo factura | Compras | Movida TCI & Jefe Compras | W03 | 09/11/26 - 13/11/26 | Planificado | Protocolo de compras y tracking de tránsito |
| **ACT-06** | Mes 1 | Entrevistas | Entrevista 5 (Planeación): Motor Resurtido Formatex Master ($S+P+T$), 13 meses CONTPAQi | Planeación | Movida TCI & Planeación | W03 | 09/11/26 - 13/11/26 | Planificado | Parámetros matemáticos de resurtido |
| **ACT-07** | Mes 1 | Gobernanza | Consolidación de Actas de Revalidación y Aprobación de Especificación Funcional | Dirección / Andrea | Andrea & Jonathan P. | W04 | 16/11/26 - 20/11/26 | **Hito de Pago** | Acta de Revalidación aprobada (Hito 2: $30,000 + IVA) |
| **ACT-08** | Mes 1 | Arquitectura | Configuración de entornos Cloud (Supabase, Render, Vercel) y Base de Datos (36 modelos) | TI / Infra | Movida TCI | W01-W04 | 26/10/26 - 20/11/26 | Prototipado | Infraestructura CI/CD y DB desplegada |
| **ACT-09** | Mes 1 | Catálogos | Módulo de Catálogos Maestros (SKUs telas, colores, proveedores, clientes, libros) | Catálogos | Movida TCI & Formatex | W03-W04 | 09/11/26 - 20/11/26 | Prototipado | Catálogos base navegables en plataforma |
| **ACT-10** | Mes 2 | Compras | Módulo de Compras y Control de Mercancía en Tránsito (Contenedores y barcos) | Compras | Movida TCI & Compras | W05-W06 | 23/11/26 - 04/12/26 | Prototipado | Módulo de OC y Tránsito funcional |
| **ACT-11** | Mes 2 | Almacén | Módulo de Recepción Asistida y Generación de Etiquetas Térmicas HU por Rollo | Almacén | Movida TCI & Almacén | W06-W07 | 30/11/26 - 11/12/26 | Prototipado | Impresión de etiquetas HU en recepción |
| **ACT-12** | Mes 2 | Calidad | Módulo de Calidad de Rollos: Calificación A, B, C, D y Bloqueo Comercial Restringido | Almacén / Calidad | Movida TCI & Almacén | W07-W08 | 07/12/26 - 18/12/26 | Prototipado | Lógica de bloqueo comercial probada |
| **ACT-13** | Mes 2 | Móvil PWA | Adaptación de PWA para terminales Zebra TC22 (Escaneo láser y movilidad) | Almacén / TI | Movida TCI | W06-W08 | 30/11/26 - 18/12/26 | Prototipado | PWA operativa para escaneo en bodega |
| **ACT-14** | Mes 2 | Slotting | Configuración Layout Nave Atlas: Pasillos 1-2, Racks 4-6, Niveles 1-2 (Pick) y 3-6 (Altura) | Almacén | Movida TCI & Almacén | W07-W08 | 07/12/26 - 18/12/26 | Prototipado | Mapa de ubicaciones físicas activo |
| **ACT-15** | Mes 3 | Ventas / ATC | Motor de Reservas de Stock (Reservas suaves para ATC y firmes para preparación) | ATC / Ventas | Movida TCI & ATC | W09-W10 | 21/12/26 - 01/01/27 | Prototipado | Reglas de reserva activa sin sobreventa |
| **ACT-16** | Mes 3 | Almacén | Módulo de Surtido por Carro ("Burros" metálicos) y Batch Picking multizona | Almacén | Movida TCI & Almacén | W09-W11 | 21/12/26 - 08/01/27 | Prototipado | Rutas de recolección optimizadas |
| **ACT-17** | Mes 3 | Mesas Corte | Flujo Mesas de Corte (Mesas 2, 3, 5 con enrolladoras) y Genealogía Rollo Padre/Hijo | Almacén / Corte | Movida TCI & Cortadores | W10-W12 | 28/12/26 - 15/01/27 | Prototipado | Pantalla de corte y retazo vivo |
| **ACT-18** | Mes 3 | Facturación | Integración con CSFacturación / Facturapi para timbrado automático CFDI 4.0 | Facturación | Movida TCI & Facturación | W11-W12 | 04/01/27 - 15/01/27 | Prototipado | Timbrado de factura post-corte funcional |
| **ACT-19** | Mes 3 | Planeación | Motor de Resurtido Automatizado Formatex Master con ingesta de 13 meses CONTPAQi | Planeación | Movida TCI & Planeación | W11-W12 | 04/01/27 - 15/01/27 | Prototipado | Algoritmo de compras sugeridas activo |
| **ACT-20** | Mes 3 | Gobernanza | Entrega y Demostración de WMS Core Completo para Pruebas de Laboratorio | Dirección / Andrea | Andrea & Jonathan P. | W12 | 11/01/27 - 15/01/27 | **Hito de Pago** | WMS Core Aprobado (Hito 3: $52,000 + IVA) |
| **ACT-21** | Mes 4 | Hardware | Auditoría Wi-Fi en Nave Atlas, adquisición y configuración de Zebra TC22 e impresoras | TI / Almacén | Formatex TI & Movida TCI | W13-W14 | 18/01/27 - 29/01/27 | Planificado | Dispositivos Zebra e impresoras térmicas listas |
| **ACT-22** | Mes 4 | Infraestructura | Rotulación física de pasillos, racks y niveles 1 al 6 en bodega según estándar WMS | Almacén | Jefe Almacén & Equipo | W13-W15 | 18/01/27 - 05/02/27 | Planificado | Nave Atlas 100% etiquetada físicamente |
| **ACT-23** | Mes 4 | Migración | Extracción, depuración y carga masiva de Catálogo Maestro e Histórico CONTPAQi | TI / Planeación | Movida TCI & TI Formatex | W14-W16 | 25/01/27 - 12/02/27 | Planificado | Base de datos poblada con data productiva |
| **ACT-24** | Mes 4 | Pruebas | Pruebas integrales de ciclo completo en Sandbox (OC -> Recibo -> Corte -> Factura) | Todas las Áreas | Movida TCI & Usuarios Clave | W15-W16 | 01/02/27 - 12/02/27 | Planificado | Matriz de pruebas sandbox completada |
| **ACT-25** | Mes 4 | Gobernanza | Aprobación de Preparación de Bodega y Autorización de Arranque en Frío | Dirección / Andrea | Andrea & Jonathan P. | W16 | 08/02/27 - 12/02/27 | **Hito de Pago** | Visto Bueno Arranque (Hito 4: $104,000 + IVA) |
| **ACT-26** | Mes 5 | Implementación | Despliegue de "Arranque en Frío Cero Paros": Delimitación Zona Blanca vs Zona Gris | Almacén | Movida TCI & Almacén | W17 | 15/02/27 - 19/02/27 | Planificado | Zona Blanca delimitada y activa en bodega |
| **ACT-27** | Mes 5 | Capacitación | Capacitación en piso a operadores de almacén: uso de Zebra TC22, recepción y corte | Almacén | Movida TCI & Operadores | W17-W18 | 15/02/27 - 26/02/27 | Planificado | Personal de almacén certificado en uso WMS |
| **ACT-28** | Mes 5 | Capacitación | Capacitación a usuarios administrativos (ATC, Compras, Facturación, Planeación) | Admin / Ventas | Movida TCI & Usuarios Admin | W18-W19 | 22/02/27 - 05/03/27 | Planificado | Personal administrativo certificado |
| **ACT-29** | Mes 5 | Operación Piloto | Entrada en operación real: 100% de nuevas compras recibidas y etiquetadas en WMS | Almacén / Compras | Almacén & Compras | W18-W20 | 22/02/27 - 12/03/27 | Planificado | Nuevos rollos 100% trazables con HU |
| **ACT-30** | Mes 5 | Operación Piloto | Surtido y corte de pedidos reales desde Zona Blanca asistidos por Zebra TC22 | Almacén / ATC | Almacén & ATC | W19-W20 | 01/03/27 - 12/03/27 | Planificado | Pedidos reales despachados con WMS |
| **ACT-31** | Mes 6 | UAT Formal | Ejecución de Pruebas de Aceptación de Usuario (UAT) formales con las 5 áreas clave | Todas las Áreas | Andrea & Usuarios Clave | W21-W22 | 15/03/27 - 26/03/27 | Planificado | Actas UAT firmadas por área |
| **ACT-32** | Mes 6 | Transición | Etiquetado e incorporación acelerada de rollos remanentes de Zona Gris a Zona Blanca | Almacén | Jefe Almacén & Champion | W21-W23 | 15/03/27 - 02/04/27 | Planificado | Bodega Nave Atlas al 95%+ bajo Zona Blanca |
| **ACT-33** | Mes 6 | Go-Live | Salida Oficial a Producción 100% del WMS en Nave Atlas (Desactivación Zona Gris) | Dirección / Operación | Dirección Formatex | W23 | 29/03/27 - 02/04/27 | **Hito Clave** | Go-Live 100% alcanzado |
| **ACT-34** | Mes 6 | Hypercare | Soporte intensivo post-arranque en piso y monitoreo fino de transacciones | Todas las Áreas | Movida TCI | W23-W24 | 29/03/27 - 09/04/27 | Planificado | Estabilidad operativa garantizada |
| **ACT-35** | Mes 6 | Cierre | Firma de Acta de Aceptación Definitiva y Entrega de Memoria Técnica de Cierre | Dirección / Andrea | Andrea & Jonathan P. | W24 | 05/04/27 - 09/04/27 | **Hito de Pago** | Cierre y Finiquito (Hito 5: $52,000 + IVA) |

---

## 6. Estrategia de Arranque en Frío "Cero Paros" (Nave Atlas)

La metodología tradicional de implementación "Big Bang" (detener operaciones durante varios días para inventariar a ciegas) resultaría perjudicial para Formatex. Por ello, el proyecto adopta el modelo de **Convivencia Progresiva ("Zona Blanca vs. Zona Gris")**:

```
                       BODEGA NAVE ATLAS (CONVIVENCIA DE 4 A 6 SEMANAS)
┌──────────────────────────────────────────────────┐  ┌──────────────────────────────────────────────────┐
│         ZONA GRIS (Operación Tradicional)        │  │         ZONA BLANCA (WMS 360+ Controlado)        │
├──────────────────────────────────────────────────┤  ├──────────────────────────────────────────────────┤
│ • Saldo existente previo al arranque.            │  │ • Racks rotulados (Pasillo-Rack-Nivel 1 al 6).   │
│ • Ubicación en WMS: ZONA-TRANSICION.             │  │ • Rollos con etiqueta térmica HU escaneable.     │
│ • Despacho tradicional por conocimiento humano.  │  │ • Recepción del 100% de nuevas compras.          │
│ • Cero fricción para los vendedores en el día 1. │  │ • Surtido asistido por escáner Zebra TC22.       │
│ • El volumen DISMINUYE conforme se vende stock.  │  │ • El volumen AUMENTA diariamente con cada venta. │
└──────────────────────────────────────────────────┘  └──────────────────────────────────────────────────┘
```

### Reglas de Operación durante la Convivencia:
1. **Regla de Entrada:** El 100% de las nuevas telas que lleguen a partir de la Semana 18 entra **directamente a Zona Blanca**: se inspecciona, se etiqueta con HU térmico y se ubica mediante Zebra TC22.
2. **Regla de Salida:** Si un pedido solicita tela que ya está en Zona Blanca, se surte mediante WMS y escaneo. Si la tela solo existe en Zona Gris, se despacha bajo el esquema tradicional registrando la salida en el sistema para descontar el saldo global.
3. **El Efecto Embudo:** Conforme pasan las semanas, la venta diaria consume la mercancía de Zona Gris mientras las compras alimentan la Zona Blanca. Para la Semana 22, más del 90% del almacén se encuentra digitalizado sin haber parado un solo día de ventas.

---

## 7. Matriz RACI de Roles y Responsabilidades

* **R (Responsible):** Quien realiza directamente la tarea.
* **A (Accountable):** Quien aprueba y responde en última instancia por el resultado.
* **C (Consulted):** Especialista o usuario clave consultado.
* **I (Informed):** Quien recibe notificación del estatus.

| Fase / Actividad Principal | Dirección Formatex | Andrea (Líder Proy) | Jefe Almacén | Líder ATC | Facturación | Compras | Planeación | TI Formatex | Movida TCI (Líder) | Movida TCI (Dev) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1. Aprobación SOW, Presupuesto y Kickoff | **A** | **R** | I | I | I | I | I | I | **R** | I |
| 2. Entrevistas de Revalidación (5 Áreas) | I | **A** | **C** | **C** | **C** | **C** | **C** | **C** | **R** | **C** |
| 3. Aprobación de Actas y Especificación | **A** | **A** | **C** | **C** | **C** | **C** | **C** | I | **R** | **C** |
| 4. Desarrollo Arquitectura y Base de Datos | I | I | I | I | I | I | I | **C** | **A** | **R** |
| 5. Módulo Catálogos y Muestrarios | I | **A** | **C** | **C** | I | **C** | **C** | **C** | **A** | **R** |
| 6. Módulo Compras, Tránsito y Recepción | I | **A** | **C** | I | I | **C** | I | I | **A** | **R** |
| 7. Módulo Calidad Rollos (A-D) y Bloqueo | I | **A** | **C** | **C** | I | I | I | I | **A** | **R** |
| 8. PWA Zebra TC22 (Escaneo y Movilidad) | I | **A** | **C** | I | I | I | I | **C** | **A** | **R** |
| 9. Surtido, Mesas de Corte y Retazos | I | **A** | **C** | **C** | I | I | I | I | **A** | **R** |
| 10. Integración CFDI 4.0 (CSFacturación) | I | **A** | I | I | **C** | I | I | **C** | **A** | **R** |
| 11. Motor Resurtido Formatex Master | I | **A** | I | I | I | **C** | **C** | **C** | **A** | **R** |
| 12. Auditoría Wi-Fi y Equipos Nave Atlas | I | **A** | **C** | I | I | I | I | **R** | **C** | I |
| 13. Rotulación de Pasillos y Racks (1-6) | I | **A** | **R** | I | I | I | I | I | **C** | I |
| 14. Extracción Data CONTPAQi | I | **A** | I | I | **C** | **C** | **C** | **R** | **R** | **R** |
| 15. Despliegue Arranque en Frío | **A** | **A** | **R** | **C** | I | **C** | I | I | **R** | **C** |
| 16. Capacitación a Operadores Almacén | I | **A** | **R** | I | I | I | I | I | **R** | **C** |
| 17. Capacitación Usuarios Administrativos | I | **A** | I | **R** | **R** | **R** | **R** | I | **R** | **C** |
| 18. Pruebas de Aceptación (UAT) | **A** | **A** | **R** | **R** | **R** | **R** | **R** | **C** | **R** | **R** |
| 19. Salida Oficial a Producción (Go-Live) | **A** | **A** | **R** | **R** | **R** | **R** | **R** | **R** | **R** | **R** |
| 20. Hipercare y Firma de Acta Final | **A** | **A** | I | I | I | I | I | I | **R** | I |

---

## 8. Matriz de Pruebas de Aceptación de Usuario (UAT) y Salida a Producción

La aprobación del proyecto para salida oficial a producción requiere la ejecución y firma satisfactoria de los siguientes 10 escenarios:

| ID Caso | Área Responsable | Escenario de Negocio | Procedimiento de Ejecución (Paso a Paso) | Criterio de Aceptación / Resultado Esperado | Estatus |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-01** | Compras / Almacén | Recepción de Rollos y Etiquetado HU | 1. Crear OC de 10 rollos Lino Tokio.<br>2. Iniciar recepción en WMS y escanear bultos.<br>3. Registrar metrajes reales recibidos.<br>4. Imprimir etiquetas térmicas con código HU. | • Cada rollo cuenta con identificador HU único escaneable.<br>• Metraje visible en stock de Recepción sin duplicar. | Aprobado Prototipo |
| **UAT-02** | Almacén / Calidad | Inspección de Calidad y Bloqueo | 1. Inspeccionar rollo HU con tara en orilla.<br>2. Calificar Calidad C con bandera Restringido.<br>3. Intentar apartar rollo desde módulo ATC. | • El rollo queda bloqueado para venta regular.<br>• ATC visualiza alerta de tara y restricción. | Aprobado Prototipo |
| **UAT-03** | Almacén | Slotting Nave Atlas (Niveles 1-6) | 1. Tomar rollo recibido con Zebra TC22.<br>2. Escanear código de ubicación física (P1-R4-N1).<br>3. Reubicar pallet a Nivel 5 (Altura montacargas). | • Ubicación actualizada en < 1 segundo.<br>• Distingue picking a pie vs buffer de altura. | Aprobado Prototipo |
| **UAT-04** | ATC / Ventas | Reserva de Stock y Muestrarios | 1. Cliente solicita 100m de Terciopelo Azul.<br>2. ATC reserva 2 rollos de 50m (reserva firme).<br>3. Registrar préstamo de libro muestrario a cliente. | • Stock comprometido bloqueado para otros asesores.<br>• Libro muestrario registrado con fecha límite. | Aprobado Prototipo |
| **UAT-05** | Almacén | Surtido por Carro (Batch Picking) | 1. Generar ola de 3 pedidos de clientes distintos.<br>2. Asignar orden de surtido a carro rodante ("burro").<br>3. Operador escanea ubicaciones en ruta óptima. | • La ruta minimiza desplazamientos en Nave Atlas.<br>• El sistema valida rollos correctos escaneados. | Aprobado Prototipo |
| **UAT-06** | Almacén / Corte | Corte en Mesa Enrolladora y Genealogía | 1. Enviar rollo padre de 60m a Mesa 2.<br>2. Cortar 25m para pedido del cliente.<br>3. Registrar corte e imprimir etiqueta para retazo de 35m. | • Se genera rollo hijo de 25m asignado al pedido.<br>• El retazo de 35m queda vivo en inventario con trazabilidad.<br>• Cero metros perdidos. | Aprobado Prototipo |
| **UAT-07** | Facturación | Timbrado Fiscal CFDI 4.0 Post-Corte | 1. Pedido con metraje real cortado (24.8m).<br>2. Enviar a timbrado mediante CSFacturación.<br>3. Validar generación de XML y PDF timbrados. | • Factura refleja el metraje real cortado y precio exacto.<br>• XML y PDF disponibles para envío por correo en segundos. | Aprobado Prototipo |
| **UAT-08** | Planeación | Motor de Resurtido Formatex Master | 1. Ingestar histórico de ventas de 13 meses CONTPAQi.<br>2. Correr motor con fórmula S + P + T vs Demanda.<br>3. Verificar sugerencias para SKUs críticos. | • Cálculo preciso de stock faltante considerando tránsito.<br>• Exportación de compras sugeridas en Excel/PDF. | Aprobado Prototipo |
| **UAT-09** | Almacén / Operación | Arranque en Frío (Zona Blanca vs Gris) | 1. Despachar pedidos simultáneos: uno de Zona Blanca y uno de Zona Gris.<br>2. Validar que la venta y el corte no se detengan. | • Cero paros operativos en Nave Atlas.<br>• Despacho fluido y coexistencia armónica. | Planificado |
| **UAT-10** | TI / Almacén | Movilidad y Robustez Zebra TC22 | 1. Realizar 50 escaneos continuos en Nave Atlas.<br>2. Validar respuesta con polvo textil y guantes de trabajo. | • PWA fluida sin congelamientos ni pérdida de datos.<br>• Sincronización instantánea con el servidor Cloud. | Planificado |

---

## 9. Estructura de Inversión y Condiciones de Pago por Hito

El presupuesto y las condiciones de cobro están estrictamente vinculados a la entrega verificable de valor según el SOW:

| Hito / Concepto | Condición de Pago (Gatillo) | Plazo Estimado | Importe (MXN) | % del Total |
| :--- | :--- | :---: | :---: | :---: |
| **1. Anticipo WMS 360+** | Inicio formal del proyecto y movilización del equipo de ingeniería | Semana 1 | $52,000.00 + IVA | 17.93% |
| **2. Consultoría y Revalidación** | Finalización de las 5 entrevistas y firma de actas de especificación | Semana 4 | $30,000.00 + IVA | 10.34% |
| **3. Pruebas Funcionales Core** | Entrega y demostración de WMS funcional para pruebas de laboratorio | Semana 12 | $52,000.00 + IVA | 17.93% |
| **4. Preparación Go-Live en Bodega** | Carga de datos maestros, rollout de hardware y arranque en frío | Semana 16 | $104,000.00 + IVA | 35.86% |
| **5. Aceptación Final y Cierre** | Go-Live oficial al 100%, pruebas UAT concluidas y firma de acta | Semana 24 | $52,000.00 + IVA | 17.93% |
| **TOTAL INVERSIÓN** | **Proyecto Integral Llave en Mano** | **24 Semanas** | **$290,000.00 + IVA** | **100.00%** |

---

## 10. Archivos y Herramientas Entregables

Para facilitar la visualización, seguimiento directivo y edición continua del plan, Movida TCI pone a disposición del cliente los siguientes recursos complementarios dentro del proyecto:

1. **Workbook Maestro Excel (`PLANEACION_PROYECTO_WMS360_FORMATEX.xlsx`):**
   * Hoja 1: *Dashboard y Ficha Ejecutiva del Proyecto.*
   * Hoja 2: *Cronograma Gantt de 24 Semanas con barras visuales y fechas calendario.*
   * Hoja 3: *Matriz de Entrevistas de Revalidación con cuestionarios y agendas.*
   * Hoja 4: *Matriz RACI completa de responsabilidades.*
   * Hoja 5: *Casos de Prueba UAT y Criterios Go-Live.*
   *(Compatible al 100% con Microsoft Excel y editable mediante importación directa en Google Sheets).*
2. **Dashboard Web Interactivo (`PLANEACION_PROYECTO_WMS360_FORMATEX.html`):**
   * Panel autónomo con diseño moderno (estilo Movida UI), selector de pestañas, diagrama interactivo de Gantt, tarjetas de las 5 entrevistas con acordeón de preguntas y botón de exportación a PDF para proyectar en videollamadas con la directiva.
3. **Guión de Diapositivas para Google Slides (`PRESENTACION_PLAN_PROYECTO_WMS360_SLIDES.md`):**
   * Estructura ejecutiva de 15 diapositivas con viñetas, tablas comparativas y las notas verbales del orador para conducir la reunión de presentación con Andrea y la dirección general.
