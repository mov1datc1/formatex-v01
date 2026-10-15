# 📊 Guión y Estructura para Google Slides / Presentación Ejecutiva
## Plan Maestro de Proyecto: WMS 360+ Formatex
**Cliente:** FORMA TEXTIL S. DE R.L. DE C.V. (Formatextil) — Guadalajara, Jalisco  
**Consultoría y Desarrollo:** MOVIDA TCI LLC  
**Líder de Proyecto:** Jonathan Palacios  
**Contraparte Directiva:** Andrea / Equipo Directivo Formatex  
**Fecha:** Octubre 2026 | **Duración Total:** 6 Meses (24 Semanas)

---

> [!TIP]
> **Instrucciones de uso:** Este documento contiene la estructura lista para copiar y pegar diapositiva por diapositiva en **Google Slides, PowerPoint o Keynote**. Incluye los títulos, contenidos visuales sugeridos, viñetas de impacto y las **Notas del Orador (Speaker Notes)** con la narrativa estratégica para presentar al cliente.

---

### Diapositiva 1: Portada Ejecutiva
* **Título Principal:** WMS 360+ FORMATEX
* **Subtítulo:** Plan Maestro de Desarrollo, Revalidación Funcional y Despliegue Operativo en Nave Atlas
* **Metadatos:**
  * **Cliente:** FORMA TEXTIL S. DE R.L. DE C.V.
  * **Presenta:** Movida TCI LLC (Jonathan Palacios)
  * **Horizonte:** 6 Meses Calendario (24 Semanas continuas)
  * **Código SOW:** MOV-WMS360-Formatex v1.0
* **Disposición Visual:** Fondo oscuro elegante (Navy/Slate), logotipo de Formatex y Movida TCI, badges de 24 semanas y 5 áreas clave.
* **Notas del Orador (Speaker Notes):**
  > "Buenos días Andrea y equipo directivo. Hoy les presentamos la planeación maestra del proyecto WMS 360+ para Formatex. Hemos estructurado una hoja de ruta de 6 meses dividida quirúrgicamente en dos etapas: 3 meses para revalidar y construir el sistema a la medida con sus áreas clave, y 3 meses para implementarlo en su bodega real en Nave Atlas bajo una metodología de 'Cero Paros'. Veamos cómo garantizaremos el éxito de este proyecto."

---

### Diapositiva 2: El Contexto y el Reto Textil
* **Título:** ¿Por qué un WMS Tradicional de Estantería Falla en Telas?
* **Puntos Clave (Tabla Comparativa):**
  * **Abarrotes / Refacciones:** Cajas cerradas, pesos fijos, códigos de barra estándar de fábrica, conteos estáticos.
  * **Distribución Textil (Formatex):**
    * Rollos con metrajes continuos y variables (48m, 51.5m, 63m).
    * Cortes diarios que crean "árboles genealógicos" (un rollo padre genera un rollo cliente + retazo vivo).
    * Almacén en altura (Racks de 6 niveles: picking a pie vs montacargas).
    * Mercancía en piso sin etiquetas de origen estandarizadas.
* **Mensaje de Cierre:** "Formatex no necesita un ERP genérico; necesita un sistema diseñado para la física real de la tela."
* **Notas del Orador:**
  > "Cualquier consultor tradicional intentaría venderles SAP o un sistema rígido que exige cerrar las puertas 4 días para contar cajas. En telas eso es imposible: ustedes no pueden parar sus ventas y la mercancía es continua. El WMS 360+ fue concebido desde el día uno para resolver la genealogía del rollo, las mesas de corte con enrolladoras y la realidad física de su Nave Atlas."

---

### Diapositiva 3: La Decisión Estratégica — Validación Temprana con Prototipo Visual
* **Título:** Mitigación de Riesgos: Nuestro Prototipo Visual Interactivo
* **Concepto Central:** "Nos anticipamos para garantizar que la solución sea viable antes de comprometer su inversión."
* **Puntos de Impacto:**
  * **Iniciativa Proactiva de Movida TCI:** Desarrollamos un prototipo visual interactivo de alta fidelidad para comprobar la factibilidad de los requerimientos más complejos.
  * **Cero Supuestos Teóricos:** Las entrevistas no serán interrogatorios sobre papel; cada área operará pantallas interactivas reales.
  * **Aceleración del Proyecto:** Al tener validada la experiencia visual, reducimos a cero las fallas de comunicación y los retrabajos.
  * **Tranquilidad para Formatex:** Ustedes pueden ver y tocar la solución antes de que entre una sola línea a su bodega.
* **Notas del Orador:**
  > "Para su total tranquilidad, nuestro equipo técnico tomó la decisión de adelantarse y construir previamente un prototipo visual interactivo. Queríamos estar 100% seguros de que podíamos resolver cada reto técnico que nos plantearon. Esto para ustedes significa una enorme ventaja: nuestras reuniones no serán teóricas; nos sentaremos con sus jefes de área a mostrarles pantallas vivas y ajustar el WMS a su operación exacta."

---

### Diapositiva 4: Visión Global de la Hoja de Ruta (6 Meses / 24 Semanas)
* **Título:** Arquitectura del Cronograma: Dos Grandes Bloques de 3 Meses
* **Esquema Visual (Timeline en 2 fases):**
  * **BLOQUE 1 (Meses 1 a 3 | Semanas 01 a 12):**
    * *Enfoque:* Revalidación Funcional, Entrevistas por Videollamada & Desarrollo WMS Core.
    * *Objetivo:* Construir y afinar el software, catálogos, PWA Zebra, mesas de corte y motor de resurtido.
  * **BLOQUE 2 (Meses 4 a 6 | Semanas 13 a 24):**
    * *Enfoque:* Infraestructura Nave Atlas, Pruebas en Bodega, Arranque en Frío y Salida a Producción (Go-Live).
    * *Objetivo:* Equipar la bodega, capacitar personal, operar en paralelo con Cero Paros y entrega final.
* **Notas del Orador:**
  > "El proyecto tiene una duración total de 6 meses. Los primeros 3 meses nos enfocamos en el software y las áreas operativas: videollamadas con 5 departamentos y programación completa de la plataforma. Los siguientes 3 meses llevamos el sistema a la bodega real: acondicionamos Nave Atlas, capacitamos operadores, corremos pruebas piloto y salimos a producción definitiva."

---

### Diapositiva 5: Bloque 1 — Desarrollo & Afinación de Código WMS
* **Título:** Bloque 1: Meses 1 a 3 (Semanas 01 a 12)
* **Entregables de Ingeniería:**
  * **Mes 1 (Semanas 1-4):**
    * 5 Entrevistas por videollamada + Actas de Revalidación.
    * Entornos Cloud (Supabase PostgreSQL, Render Backend, Vercel Frontend).
    * Catálogos Maestros (Telas, Colores, Proveedores, Muestrarios/Libros).
  * **Mes 2 (Semanas 5-8):**
    * Módulo de Compras y Seguimiento de Tránsito (Contenedores).
    * Recepción Asistida de Rollos con Etiquetado HU térmico.
    * Calidad de Rollos (Calificación A-D y Bloqueo Comercial Restringido).
    * PWA Móvil para terminales Zebra TC22 (Escaneo láser).
  * **Mes 3 (Semanas 9-12):**
    * Surtido por Carro ("Burros" metálicos) y Batch Picking.
    * Mesas de Corte (Mesas 2, 3, 5 con enrolladoras) y Genealogía de Retazos.
    * Integración CFDI 4.0 con CSFacturación / Facturapi.
    * Motor de Resurtido Automatizado Formatex Master (13 meses CONTPAQi).
* **Notas del Orador:**
  > "Al terminar el mes 3, el sistema WMS Core estará 100% construido y probado en laboratorio. La base de datos, las 35 tablas, la PWA en Zebra y la integración fiscal estarán listas para pasar a la fase de campo."

---

### Diapositiva 6: Programa de Entrevistas por Videollamada
* **Título:** Las 5 Sesiones Estratégicas de Revalidación (Semanas 1 a 3)
* **Estructura de las Sesiones:**
  * Formato: Videollamada (Google Meet / Zoom) de 60 a 90 minutos.
  * Dinámica: Proyección del prototipo visual interactivo + Cuestionario guiado + Levantamiento de reglas.
* **Las 5 Áreas Involucradas:**
  1. 📦 **Almacén y Nave Atlas** (Recepción, calidad A-D, etiquetado HU, niveles de racks y cortes).
  2. 💬 **ATC y Ventas** (Stock disponible, reservas de rollos, tolerancia de metraje y muestrarios).
  3. 🧾 **Cobranza y Facturación** (Momento de timbrado CFDI 4.0, CSFacturación, crédito y remisiones).
  4. 🚢 **Compras y Tránsito** (OC importación, tracking de contenedores y cotejo contra factura).
  5. 📈 **Planeación y Resurtido** (Algoritmo Formatex Master $S+P+T$, 13 meses CONTPAQi y forecasting).
* **Notas del Orador:**
  > "En las primeras 3 semanas nos entrevistaremos con sus 5 líderes de departamento. No les quitaremos días enteros; serán sesiones puntuales de 75 a 90 minutos donde les pondremos en pantalla el prototipo y les diremos: 'Así pensamos tu pantalla de recepción, así se ve el corte de lino, así timbramos la factura'. De cada sesión saldrá un acta formal de acuerdos."

---

### Diapositiva 7: Foco de Entrevistas — Almacén & ATC
* **Título:** Entrevistas Operativas: Almacén y Atención a Clientes
* **Sesión 1: Almacén (Semanas 1-2 | 90 min):**
  * *¿Quiénes?* Jefe de Almacén, Encargado Nave Atlas, Operador Líder de Corte, Andrea y Movida TCI.
  * *Puntos Críticos:* Clasificación de calidades A-D; bloqueo de rollos con tara; racks de 6 niveles (picking a pie niveles 1-2 vs montacargas niveles 3-6); flujo de mesas de corte enrolladoras; picking en burros rodantes.
* **Sesión 2: ATC / Ventas (Semana 2 | 75 min):**
  * *¿Quiénes?* Coordinador de ATC, Ejecutivos de Ventas Mayoreo, Andrea y Movida TCI.
  * *Puntos Críticos:* Reglas de reserva (¿rollo completo o metros fraccionados?); tolerancia de corte (¿qué hacer si el rollo tiene 53m y piden 50m?); venta de rollos B/C con descuento; gestión de libros de muestrario.
* **Notas del Orador:**
  > "En almacén validaremos cómo sus cortadores usan las mesas mecánicas 2, 3 y 5, y cómo los montacarguistas bajan stock de los niveles 3 al 6. Con ATC definiremos las reglas de oro: evitar retazos huérfanos de 2 o 3 metros que nadie compra, y cómo apartar stock sin crear disputas entre vendedores."

---

### Diapositiva 8: Foco de Entrevistas — Facturación, Compras & Planeación
* **Título:** Entrevistas Administrativas: Facturación, Compras y Planeación
* **Sesión 3: Cobranza y Facturación (Semana 2 | 75 min):**
  * *Puntos Críticos:* Momento de timbrado fiscal (timbrar tras confirmación de metraje real cortado); integración vía API REST de CSFacturación; candados comerciales por límite de crédito vencido.
* **Sesión 4: Compras y Tránsito (Semana 3 | 75 min):**
  * *Puntos Críticos:* Registro de contenedores marítimos en tránsito; diferencias de metraje proveedor vs recibido; catálogo homologado de telas y colores.
* **Sesión 5: Planeación y Resurtido (Semana 3 | 75 min):**
  * *Puntos Críticos:* Calibración de la fórmula $S+P+T$ vs $4M \times 4.5$; ingesta del histórico de 13 meses de ventas desde CONTPAQi; clasificación ABC de telas continuas vs moda.
* **Notas del Orador:**
  > "En facturación garantizamos que el CFDI 4.0 refleje los metros exactos cortados, evitando cancelaciones de facturas. En compras conectamos los contenedores que vienen en barco. Y con planeación afinamos el motor de resurtido para que el sistema les diga exactamente qué rollos comprar antes de que se agoten."

---

### Diapositiva 9: Bloque 2 — Bodega Nave Atlas, Pruebas y Go-Live
* **Título:** Bloque 2: Meses 4 a 6 (Semanas 13 a 24)
* **Ruta de Despliegue en Campo:**
  * **Mes 4 (Semanas 13-16): Equipamiento y Preparación de Datos**
    * Auditoría Wi-Fi en Nave Atlas y configuración de Zebra TC22 e impresoras.
    * Rotulación física de racks (Pasillos 1-2, Racks 4-6, Niveles 1-6).
    * Carga masiva de catálogos e histórico de ventas CONTPAQi.
    * Pruebas integrales en ambiente Sandbox de pruebas.
  * **Mes 5 (Semanas 17-20): Arranque en Frío & Piloto Real**
    * Delimitación de Zona Blanca (WMS) vs Zona Gris (Tradicional).
    * Capacitación en piso a operadores de almacén y personal administrativo.
    * Entrada en operación: 100% de nuevas compras recibidas con WMS.
    * Surtido y corte de pedidos reales asistidos por escáner.
  * **Mes 6 (Semanas 21-24): UAT Formal, Go-Live 100% & Cierre**
    * Ejecución formal de casos de prueba UAT con las 5 áreas.
    * Absorción total de inventario a Zona Blanca.
    * Salida Oficial a Producción 100% (Desactivación de Zona Gris).
    * Periodo de soporte intensivo (Hypercare) y firma de acta de cierre.
* **Notas del Orador:**
  > "El bloque 2 es donde la magia ocurre en el piso de la bodega. No vamos a improvisar. Primero equipamos Nave Atlas, luego capacitamos a su gente, después arrancamos en frío con mercancía nueva, y finalmente absorbemos el inventario viejo hasta que el 100% de la bodega esté digitalizado."

---

### Diapositiva 10: Estrategia de Arranque en Frío — "Cero Paros"
* **Título:** Metodología Cero Paros: Convivencia Zona Blanca vs. Zona Gris
* **El Problema del Big Bang:** Parar la bodega 4 días generaría pérdidas de ventas millonarias e histeria en los clientes.
* **Nuestra Solución (Arranque Progresivo):**
  * **Zona Gris (Almacén Tradicional):**
    * Mercancía existente previa al arranque.
    * Saldo controlado por Excel maestro / inventario de transición.
    * Se sigue despachando de forma tradicional para no detener a los vendedores.
  * **Zona Blanca (WMS 360+ Controlado):**
    * Todo rollo nuevo que llega de compras se etiqueta con HU y se ubica con Zebra TC22.
    * Ubicaciones rotuladas en Nave Atlas (Pasillo-Rack-Nivel).
    * Cada corte genera retazo vivo hijo con código de barras térmico.
  * **La Migración Natural:** Conforme los pedidos consumen rollos viejos y entran compras nuevas, la Zona Blanca se traga a la Zona Gris sin fricción ni paros.
* **Notas del Orador:**
  > "Esta es la clave por la que nuestro proyecto es seguro: Formatex NO se detiene un solo minuto. Las ventas y despachos continúan al 100%. Convivimos entre una Zona Gris de transición y una Zona Blanca controlada por el WMS, hasta que en pocas semanas toda la bodega queda operando con escaneo digital."

---

### Diapositiva 11: Adecuación Física en Nave Atlas
* **Título:** Adecuación Física y Tecnología en Nave Atlas
* **Componentes de Campo:**
  1. 📶 **Cobertura Wi-Fi Industrial:** Verificación de señal en pasillos de racks de 6 niveles para garantizar sincronización sin cortes.
  2. 📱 **Terminales Zebra TC22:** Dispositivos ergonómicos para montacarguistas y operadores, con escáner láser rápido y PWA responsive.
  3. 🖨️ **Impresoras Térmicas de Etiquetas HU:** Ubicadas en mesa de recepción y mesas de corte para etiquetar rollos y retazos en 2 segundos.
  4. 🏷️ **Rotulación Estandarizada:** Respeto a los rótulos actuales (`PASILLO 1`, `2`, racks `4, 5, 6`) y codificación de niveles:
     * *Niveles 1 y 2:* Picking manual a pie.
     * *Niveles 3 al 6:* Almacenamiento en altura (montacargas).
  5. ✂️ **Mesas 2, 3 y 5:** Integración de pantallas táctiles con contadores mecánicos para corte preciso.
* **Notas del Orador:**
  > "Respetamos la infraestructura que Formatex ya tiene. No venimos a cambiarles sus pasillos ni a inventar nombres raros. Adoptamos su nomenclatura existente, colocamos etiquetas térmicas industriales resistentes al polvo textil y dejamos a sus operadores armados con terminales Zebra TC22 de uso rudo."

---

### Diapositiva 12: Pruebas de Aceptación de Usuario (UAT)
* **Título:** Criterios de Calidad: 10 Casos de Prueba Punta a Punta
* **Casos de Validación Formal (Aprobación por Área):**
  * **UAT-01 (Compras/Almacén):** Recepción de rollos con impresión de HU y metrajes reales.
  * **UAT-02 (Calidad):** Calificación A-D y bloqueo automático de rollos con tara o defecto.
  * **UAT-03 (Slotting):** Reubicación de rollos en Nave Atlas distinguiendo picking vs altura montacargas.
  * **UAT-04 (ATC/Ventas):** Reserva de rollos sin sobreventa y control de préstamo de libros muestrarios.
  * **UAT-05 (Almacén):** Batch picking en carros rodantes ("burros") con ruta óptima de pasillos.
  * **UAT-06 (Corte):** Corte en máquina enrolladora: rollo padre de 60m genera pedido de 25m + retazo de 35m con trazabilidad.
  * **UAT-07 (Facturación):** Timbrado CFDI 4.0 automático vía CSFacturación con metraje exacto cortado.
  * **UAT-08 (Planeación):** Cálculo de compras sugeridas con motor Formatex Master y 13 meses CONTPAQi.
  * **UAT-09 (Operación):** Despacho simultáneo en Zona Blanca y Zona Gris sin interrupciones.
  * **UAT-10 (Tecnología):** Operación continua en Zebra TC22 en condiciones reales de polvo y batería.
* **Notas del Orador:**
  > "El pase a producción no se basa en opiniones; se basa en hechos. Ejecutaremos estos 10 casos de prueba con sus usuarios clave. Cuando cada área firme su escenario de prueba conforme a los criterios esperados, declaramos formalmente el Go-Live."

---

### Diapositiva 13: Matriz RACI de Gobernanza
* **Título:** Gobernanza del Proyecto: Roles Claros para el Éxito
* **Esquema de Trabajo Colaborativo:**
  * **Formatex (Dirección / Andrea):**
    * Aprobación del SOW y liberación de pagos por hitos.
    * Convocatoria y asistencia obligatoria de sus líderes a las 5 entrevistas.
    * Coordinación de rotulación en Nave Atlas y facilitación de catálogo CONTPAQi.
    * Designación de un "Champion de Almacén" para liderar el cambio en piso.
  * **Movida TCI (Jonathan Palacios & Equipo Técnico):**
    * Liderazgo técnico, arquitectura y desarrollo integral del software.
    * Conducción de las 5 entrevistas de revalidación y actas de acuerdos.
    * Despliegue de infraestructura Cloud (Supabase, Render, Vercel, CSFacturación).
    * Capacitación a operadores y acompañamiento presencial/remoto en bodega.
* **Notas del Orador:**
  > "El éxito de un WMS es 50% tecnología y 50% adopción humana. Nosotros garantizamos que la tecnología será impecable y robusta. Necesitamos de ustedes el compromiso de que sus 5 líderes asistan a las entrevistas y que designemos a un operador líder que sea nuestro campeón en piso."

---

### Diapositiva 14: Inversión y Condiciones de Pago (SOW)
* **Título:** Estructura de Inversión y Condiciones de Pago
* **Inversión Total:** **$290,000.00 MXN + IVA** (Dividido en 5 Hitos Vinculados a Entregables)

| Hito / Concepto | Condición de Pago (Gatillo) | Plazo Estimado | Importe (MXN) | % Total |
| :--- | :--- | :---: | :---: | :---: |
| **1. Anticipo WMS 360+** | Inicio formal del proyecto y movilización del equipo | Semana 1 | $52,000 + IVA | 17.9% |
| **2. Consultoría y Revalidación** | Finalización de 5 entrevistas y firma de actas | Semana 4 | $30,000 + IVA | 10.3% |
| **3. Pruebas Funcionales Core** | Entrega de WMS funcional para pruebas de laboratorio | Semana 12 | $52,000 + IVA | 17.9% |
| **4. Preparación Go-Live Bodega** | Datos maestros cargados, hardware y arranque en frío | Semana 16 | $104,000 + IVA | 35.9% |
| **5. Aceptación Final y Cierre** | Go-Live 100%, pruebas UAT concluidas y firma de acta | Semana 24 | $52,000 + IVA | 17.9% |
| **TOTAL** | **Proyecto Completo Llave en Mano** | **24 Semanas** | **$290,000 + IVA** | **100%** |

* **Notas del Orador:**
  > "Nuestra estructura de cobro está alineada estrictamente al SOW. Ustedes no pagan por promesas; pagan por entregables concretos verificados. El anticipo pone en marcha el equipo; la consultoría se liquida cuando entregamos las actas de las 5 áreas; el software core se paga cuando lo ven funcionando; la preparación de bodega cubre el despliegue en Nave Atlas; y el finiquito se paga únicamente cuando el WMS está en vivo y ustedes firman el acta de satisfacción."

---

### Diapositiva 15: Próximos Pasos Inmediatos
* **Título:** Arranque Inmediato: Plan de Acción para la Semana 1
* **Línea de Acción:**
  1. ✍️ **Firma Formal del SOW (Revisión v1.1) y Liquidación del Anticipo (Hito 1: $52,000 + IVA).**
  2. 📅 **Convocatoria a Calendario de Entrevistas (Semanas 1 y 2):**
     * Enviar invitaciones por Google Calendar con enlaces de videollamada para Almacén, ATC, Facturación, Compras y Planeación.
  3. 📦 **Preparación de Catálogos:** Solicitar a TI / Contabilidad la extracción de catálogos maestros y reporte de ventas históricas CONTPAQi.
  4. 🚀 **Sesión de Apertura (Kickoff):** Presentación del equipo de trabajo y arranque de la primera sesión con Almacén.
* **Frase de Cierre:**  
  *"El prototipo ya demostró que es viable. Ahora hagámoslo una realidad operativa para Formatex."*
* **Preguntas y Respuestas (Q&A)**
* **Notas del Orador:**
  > "Estamos listos para empezar hoy mismo. En cuanto formalicemos el SOW y el anticipo, enviamos las invitaciones de calendario para las primeras entrevistas. Tenemos todo preparado para hacer de este WMS el pilar de crecimiento y orden operativo de Formatex en Guadalajara. ¿Tienen alguna duda o comentario?"
