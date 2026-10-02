# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-02

### Added
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
