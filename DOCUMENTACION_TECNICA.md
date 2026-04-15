# 🏭 WMS 360+ Formatex — Documentación Técnica v2.0

**Plataforma:** WMS 360+ — Sistema de Gestión de Almacén para Distribuidora de Tela al Mayoreo  
**Empresa:** FORMA TEXTIL S. DE R.L. DE C.V. (Formatextil)  
**Ubicación:** Río La Barca No. 1680, Atlas C.P. 44870, Guadalajara, Jalisco  
**Desarrollado por:** Movida TCI  
**Última actualización:** Abril 2026

---

## 📋 Tabla de Contenido

1. [Infraestructura de Producción](#1-infraestructura-de-producción)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Variables de Entorno](#3-variables-de-entorno)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Base de Datos (26 Modelos)](#5-base-de-datos-26-modelos)
6. [Módulos Funcionales (13)](#6-módulos-funcionales-13)
7. [PWA Mobile (Zebra TC22)](#7-pwa-mobile-zebra-tc22)
8. [Integración CONTPAQi Cloud (Fase 2)](#8-integración-contpaqi-cloud-fase-2)
9. [Sistema de Sugerencias Inteligentes](#9-sistema-de-sugerencias-inteligentes)
10. [Flujo de Inventario (Entrada / Corte / Salida)](#10-flujo-de-inventario)
11. [Sistema de Reservas (Anti Doble-Venta)](#11-sistema-de-reservas-anti-doble-venta)
12. [Transferencias entre Almacenes](#12-transferencias-entre-almacenes)
13. [Seguridad y Autenticación](#13-seguridad-y-autenticación)
14. [Comandos Útiles](#14-comandos-útiles)
15. [Troubleshooting](#15-troubleshooting)
16. [Changelog v2.0](#16-changelog-v20)

---

## 1. Infraestructura de Producción

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React + TypeScript | React 19.2, TS 6.0 |
| **Build Tool** | Vite | 8.0 |
| **CSS** | Tailwind CSS | 4.2 |
| **State Management** | Redux Toolkit + React Query | RTK 2.11, TanStack 5.99 |
| **Routing** | React Router DOM | 7.14 |
| **Backend** | NestJS + TypeScript | NestJS 11, TS 5.7 |
| **ORM** | Prisma Client | 7.7 |
| **Database** | PostgreSQL (Supabase) | 15+ |
| **Auth** | JWT (Passport) | - |
| **API Docs** | Swagger (OpenAPI) | - |
| **Charts** | Chart.js + react-chartjs-2 | 4.5 |
| **Icons** | Lucide React | 1.8 |
| **Forms** | React Hook Form | 7.72 |
| **Toasts** | React Hot Toast | 2.6 |
| **Etiquetas** | JsBarcode + QRCode | - |

### Diagrama de Infraestructura

```
┌───────────────────────────────────────────────────────┐
│                   FRONTEND (Vite)                      │
│          React 19 + TailwindCSS 4 + TypeScript         │
│                 Puerto: 5173 (dev)                     │
│                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │Dashboard │ │ Pedidos  │ │Inventario│ │ Zebra PWA │ │
│  │          │ │ (9 est.) │ │(HU-céntrico)│ │(TC22)    │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│                        │                               │
│         Vite Proxy:  /api → localhost:3000              │
└────────────────────────┼──────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────┐
│                  BACKEND (NestJS)                       │
│            REST API + JWT + Swagger                     │
│               Puerto: 3000                              │
│           Prefijo global: /api                          │
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  Auth  │ │Catalog │ │Inventory│ │ Orders │          │
│  │        │ │        │ │+ Suggest│ │ (CRUD) │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │Cutting │ │Packing │ │Shipping│ │Transfers│          │
│  │(corte) │ │(empaque)│ │(envío) │ │(bodega) │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │Transit │ │Reserve │ │Warehouse│ │ Users  │          │
│  │(tráns.)│ │(reserva)│ │(config) │ │(admin) │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│                        │                               │
│             Prisma ORM + PG Adapter                     │
└────────────────────────┼──────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────┐
│              PostgreSQL (Supabase)                      │
│         26 tablas · Pooler mode · max 3 conn            │
│      aws-1-us-west-2.pooler.supabase.com:5432          │
└───────────────────────────────────────────────────────┘
```

### Puertos

| Servicio | Puerto | Protocolo |
|----------|--------|-----------|
| Frontend (Vite dev) | `5173` | HTTP |
| Backend (NestJS) | `3000` | HTTP |
| Swagger Docs | `3000/api/docs` | HTTP |
| PostgreSQL (Supabase) | `5432` | TCP |

---

## 2. Arquitectura del Sistema

### Principios de Diseño

- **HU-Céntrico**: Cada rollo/retazo es un Handling Unit (HU) individual con código único, trazabilidad completa y genealogía de cortes
- **FIFO**: Los rollos más viejos se sugieren primero para surtido
- **Reservas Blanda/Firme**: Sistema anti doble-venta con expiración automática de 24h
- **Inventario en Tránsito**: Visibilidad de embarques entrantes con ETA, reservable antes de llegar
- **Genealogía de Cortes**: Trazabilidad padre→hijo en cada operación de corte
- **9 Estados de Pedido**: Flujo real de Formatex desde cotización hasta despacho
- **RBAC Granular**: Control por módulo + acción (read/create/update/delete)

### Patrones Arquitectónicos

| Patrón | Implementación |
|--------|---------------|
| **Monolito Modular** | 13 módulos NestJS independientes |
| **Repository Pattern** | Prisma como capa de datos |
| **JWT Stateless** | Tokens firmados, sin sesión en servidor |
| **Global Prisma Module** | `@Global()` — inyección disponible en todos los módulos |
| **Redux Persist Manual** | Estado auth en `localStorage` (clave: `wms360_auth`) |
| **Vite Proxy** | `/api` → backend, sin CORS issues en desarrollo |
| **TanStack Query** | Cache + refetch automático + invalidación |

---

## 3. Variables de Entorno

### Backend (`wms-backend/.env`)

```env
# PostgreSQL — Supabase Pooler
DATABASE_URL="postgresql://postgres.{PROJECT_REF}:{PASSWORD}@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

# Conexión directa (para migraciones Prisma)
DIRECT_URL="postgresql://postgres:{PASSWORD}@db.{PROJECT_REF}.supabase.co:5432/postgres"

# Auth
JWT_SECRET="wms360-formatex-secret-key-2026"

# Server
PORT=3000
```

### Frontend (`wms-frontend/.env`)

```env
# API URL (solo si NO se usa Vite proxy)
VITE_API_URL=/api
```

> **Nota:** El frontend usa el proxy de Vite (`/api` → `localhost:3000`) en desarrollo. En producción, `VITE_API_URL` debe apuntar al dominio del backend.

---

## 4. Estructura del Proyecto

```
wms-formatex-v2/
├── wms-backend/                    # NestJS API (11,459 líneas TS)
│   ├── prisma/
│   │   ├── schema.prisma           # 904 líneas — 26 modelos
│   │   └── seed.ts                 # 338 líneas — datos demo completos
│   ├── src/
│   │   ├── main.ts                 # Bootstrap + Swagger + CORS
│   │   ├── app.module.ts           # Registro de 13 módulos
│   │   ├── prisma.module.ts        # @Global() Prisma
│   │   ├── prisma.service.ts       # PG Pool adapter (max 3 conn)
│   │   └── modules/
│   │       ├── auth/               # Login + JWT + Guard
│   │       ├── catalog/            # SKUs, Suppliers, Clients, Vendors
│   │       ├── inventory/          # HUs, Locations, Movements, SuggestHUs
│   │       ├── orders/             # Pedidos 9 estados, Lines, Assignments
│   │       ├── cutting/            # Corte de rollos + genealogía
│   │       ├── reception/          # Recepción de pallets → HUs
│   │       ├── warehouse/          # Almacenes, Zonas, Ubicaciones, Merma
│   │       ├── reservations/       # Reservas blanda/firme
│   │       ├── transit/            # Embarques entrantes + ETA
│   │       ├── packing/            # Empaque + Packing Slips
│   │       ├── shipping/           # Despacho + Envíos
│   │       ├── transfers/          # Transferencias entre almacenes
│   │       └── users/              # Admin: Users, Roles, Permissions, Settings
│   └── package.json
│
└── wms-frontend/                   # React + Vite + Tailwind
    ├── vite.config.ts              # Proxy + Tailwind plugin
    ├── src/
    │   ├── main.tsx                # Entry + React Query + Redux Provider
    │   ├── index.css               # Estilos base
    │   ├── config/
    │   │   └── api.ts              # Axios instance + interceptors JWT + 401
    │   ├── store/
    │   │   ├── index.ts            # Redux store + localStorage persist
    │   │   └── slices/
    │   │       ├── authSlice.ts    # login/logout/updateProfile
    │   │       └── uiSlice.ts     # UI state
    │   ├── hooks/
    │   │   └── useApi.ts           # useApi + useMutationApi + types
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── DashboardLayout.tsx
    │   │   │   └── Sidebar.tsx     # Navigation + RBAC visibility
    │   │   ├── icons/
    │   │   │   └── WmsIcons.tsx    # Icon system + StatusBadge
    │   │   ├── labels/             # Label printing / barcode
    │   │   └── orders/
    │   │       └── OrderLineSmart.tsx  # Sugerencias inteligentes UI
    │   ├── pages/
    │   │   ├── Dashboard.tsx       # KPIs + charts
    │   │   ├── auth/Login.tsx
    │   │   ├── orders/PedidosPage.tsx
    │   │   ├── picking/PickingPage.tsx
    │   │   ├── cutting/CortePage.tsx
    │   │   ├── packing/EmpaquePage.tsx
    │   │   ├── shipping/EnvioPage.tsx
    │   │   ├── reception/RecepcionPage.tsx
    │   │   ├── inventory/RollosPage.tsx
    │   │   ├── inventory/RetazosPage.tsx
    │   │   ├── warehouse/AlmacenPage.tsx
    │   │   ├── warehouse/UbicacionesPage.tsx
    │   │   ├── catalog/CatalogosPage.tsx
    │   │   ├── transit/TransitoPage.tsx
    │   │   ├── availability/DisponibilidadPage.tsx
    │   │   ├── labeling/EtiquetasPage.tsx
    │   │   ├── alerts/AlertasPage.tsx
    │   │   ├── transfers/TransferenciasPage.tsx
    │   │   ├── admin/AdminPage.tsx
    │   │   ├── config/ConfigPage.tsx
    │   │   └── pwa/                # Zebra PWA
    │   │       ├── ZebraLayout.tsx
    │   │       ├── PickerView.tsx
    │   │       ├── CortadorView.tsx
    │   │       └── ScanInput.tsx
    │   └── routes/
    │       └── AppRouter.tsx       # 20+ rutas protegidas
    └── package.json
```

---

## 5. Base de Datos (26 Modelos)

### Diagrama Entidad-Relación

```mermaid
erDiagram
    Warehouse ||--o{ Zone : "tiene"
    Warehouse ||--o{ Location : "tiene"
    Warehouse ||--o{ MermaRangeConfig : "configura"
    Zone ||--o{ Location : "contiene"
    Location ||--o{ HandlingUnit : "alberga"
    
    SkuMaster ||--o{ HandlingUnit : "instancia"
    SkuMaster ||--o{ IncomingShipmentLine : "espera"
    Supplier ||--o{ SkuMaster : "provee"
    Supplier ||--o{ PurchaseReceipt : "entrega"
    Supplier ||--o{ IncomingShipment : "envía"
    
    Client ||--o{ Order : "ordena"
    Vendor ||--o{ Client : "atiende"
    Vendor ||--o{ Order : "vende"
    
    HandlingUnit ||--o{ HandlingUnit : "genealogía"
    HandlingUnit ||--o{ CutOperation : "origen_corte"
    HandlingUnit ||--o{ CutOperation : "retazo_generado"
    HandlingUnit ||--o{ InventoryMovement : "movimientos"
    HandlingUnit ||--o{ OrderLineAssignment : "asignaciones"
    HandlingUnit ||--o{ Reservation : "reservas"
    HandlingUnit ||--o{ TransferLine : "transferencias"
    
    Order ||--o{ OrderLine : "líneas"
    Order ||--o{ PackingSlip : "empaque"
    Order ||--o{ Shipment : "envío"
    Order ||--o{ Reservation : "reservas"
    OrderLine ||--o{ OrderLineAssignment : "asignaciones"
    OrderLine ||--o{ CutOperation : "cortes"
    
    IncomingShipment ||--o{ IncomingShipmentLine : "líneas"
    IncomingShipmentLine ||--o{ Reservation : "reservas_tránsito"
    
    Transfer ||--o{ TransferLine : "líneas"
    
    Role ||--o{ User : "usuarios"
    Role ||--o{ RolePermission : "permisos"
    User ||--o{ InventoryMovement : "ejecuta"
    User ||--o{ AuditLog : "auditoría"
```

### Modelos por Grupo

#### Grupo 1: Almacén Físico (4 modelos)

| Modelo | Descripción | Filas seed |
|--------|-------------|------------|
| `Warehouse` | Almacenes físicos y virtuales | 3 (1 físico + 2 virtuales) |
| `Zone` | Zonas operativas (RE, MER, CORTE, etc.) | 8 |
| `Location` | Ubicaciones individuales (rack/piso/staging/muelle) | 135 |
| `MermaRangeConfig` | Rangos de merma configurables | 3 |

**Tipos de Zona:** `ROLLOS_ENTEROS`, `MERMA`, `RECIBO`, `CORTE`, `EMPAQUE`, `EMBARQUE`  
**Estados de Ubicación:** `LIBRE`, `PARCIAL`, `OCUPADA`, `BLOQUEADA`

#### Grupo 2: Catálogos (4 modelos)

| Modelo | Descripción |
|--------|-------------|
| `SkuMaster` | Catálogo de telas (código Formatex, categoría, color, precio) |
| `Supplier` | Proveedores de tela |
| `Client` | Clientes con dirección completa + vendedor asignado |
| `Vendor` | Vendedores callejeros con comisión |

#### Grupo 3: Inventario HU-Céntrico (3 modelos)

| Modelo | Descripción |
|--------|-------------|
| `HandlingUnit` | ⭐ Core — cada rollo/retazo individual con metraje, genealogía, FIFO |
| `InventoryMovement` | Trazabilidad de movimientos (8 tipos) |
| `Reservation` | Reservas blanda (24h) y firme (anti doble-venta) |

**Estados del HU:** `DISPONIBLE`, `RESERVADO_BLANDO`, `RESERVADO`, `EN_PICKING`, `EN_CORTE`, `EN_EMPAQUE`, `DESPACHADO`, `AGOTADO`, `DANADO`  
**Tipos de Movimiento:** `ENTRADA`, `SALIDA`, `CORTE`, `REUBICACION`, `AJUSTE`, `CONTEO`, `RESERVA`, `TRANSFERENCIA`

#### Grupo 4: Inventario en Tránsito (2 modelos)

| Modelo | Descripción |
|--------|-------------|
| `IncomingShipment` | Embarques entrantes con ETA y transportista |
| `IncomingShipmentLine` | Líneas de embarque por SKU + metraje reservable |

**Estados:** `EN_TRANSITO`, `PARCIAL`, `RECIBIDO`, `CANCELADO`

#### Grupo 5: Recepción (2 modelos)

| Modelo | Descripción |
|--------|-------------|
| `PurchaseReceipt` | Recepciones de pallet con OC y transportista |
| `PurchaseReceiptLine` | Líneas por SKU — genera HUs automáticamente |

#### Grupo 6: Pedidos y Despacho (5 modelos)

| Modelo | Descripción |
|--------|-------------|
| `Order` | ⭐ Pedidos con 9 estados, financieros, folio CONTPAQi |
| `OrderLine` | Líneas por SKU + metraje requerido/surtido |
| `OrderLineAssignment` | Asignación de HUs a líneas (permite combinación) |
| `PackingSlip` | Packing slips para empaque |
| `Shipment` | Envíos con guía, transportista, confirmación entrega |

**9 Estados del Pedido:**
```
COTIZADO → POR_PAGAR → PAGO_RECIBIDO → POR_SURTIR →
EN_SURTIDO → EN_CORTE → EMPACADO → FACTURADO → DESPACHADO
                                                (CANCELADO)
```

#### Grupo 7: Corte (1 modelo)

| Modelo | Descripción |
|--------|-------------|
| `CutOperation` | Operación de corte: HU origen → metraje cortado + retazo generado |

**Flujo:** HU Origen (50m) → Corte 41m → Retazo 9m (nuevo HU hijo, generación +1)

#### Grupo 8: Transferencias (2 modelos)

| Modelo | Descripción |
|--------|-------------|
| `Transfer` | Transferencia entre almacenes con aprobación |
| `TransferLine` | HUs transferidos con snapshots de datos |

**Estados:** `PENDIENTE`, `EN_TRANSITO`, `COMPLETADA`, `CANCELADA`

#### Grupo 9: Alertas (2 modelos)

| Modelo | Descripción |
|--------|-------------|
| `Alert` | Alertas del sistema (stock bajo, retazo sin ubicar, etc.) |
| `Task` | Tareas asignables vinculadas a alertas |

**Tipos de Alerta:** `STOCK_BAJO`, `RETAZO_SIN_UBICAR`, `PEDIDO_ATRASADO`, `MERMA_EXCESIVA`, `ROLLO_PERDIDO`, `CONTEO_DISCREPANCIA`, `RESERVA_EXPIRADA`, `TRANSITO_RETRASADO`

#### Grupo 10: Auth + RBAC + Auditoría (4 modelos)

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios con rol y último login |
| `Role` | Roles jerárquicos (nivel 1-4) |
| `RolePermission` | Permisos granulares: módulo × acción |
| `AuditLog` | Log de auditoría con IP y detalle JSON |

#### Grupo 11: Sistema (3 modelos)

| Modelo | Descripción |
|--------|-------------|
| `SystemSetting` | Configuraciones clave-valor (empresa, SMTP, reservas) |
| `IntegrationConfig` | Config de integraciones externas (CONTPAQi) |
| `SyncLog` | Log de sincronización con ERP |

---

## 6. Módulos Funcionales (13)

### 6.1 Auth (`/api/auth`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/login` | Iniciar sesión (username o email + password) |
| `GET` | `/auth/me` | 🔒 Perfil del usuario autenticado con permisos |

**Flujo de login:**
1. Busca usuario por `username` o `email` (activo = true)
2. Compara password con bcrypt
3. Actualiza `ultimoLogin`
4. Genera JWT con `{ sub, username, role, nivel }`
5. Registra `AuditLog` tipo `LOGIN`
6. Retorna token + objeto user con permisos

### 6.2 Catalog (`/api/catalog`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/catalog/skus` | 🔒 Listar SKUs (búsqueda, categoría, paginación) |
| `GET` | `/catalog/skus/categories` | 🔒 Categorías de telas |
| `GET` | `/catalog/skus/:id` | 🔒 Detalle de SKU |
| `POST` | `/catalog/skus` | 🔒 Crear SKU |
| `PUT` | `/catalog/skus/:id` | 🔒 Actualizar SKU |
| `GET` | `/catalog/suppliers` | 🔒 Listar proveedores |
| `POST` | `/catalog/suppliers` | 🔒 Crear proveedor |
| `PUT` | `/catalog/suppliers/:id` | 🔒 Actualizar proveedor |
| `GET` | `/catalog/clients` | 🔒 Listar clientes |
| `POST` | `/catalog/clients` | 🔒 Crear cliente |
| `PUT` | `/catalog/clients/:id` | 🔒 Actualizar cliente |
| `GET` | `/catalog/vendors` | 🔒 Listar vendedores |
| `POST` | `/catalog/vendors` | 🔒 Crear vendedor |
| `PUT` | `/catalog/vendors/:id` | 🔒 Actualizar vendedor |

### 6.3 Inventory (`/api/inventory`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/inventory/stats` | 🔒 KPIs: total HUs, rollos, retazos, metraje |
| `GET` | `/inventory/hus` | 🔒 Listar HUs (búsqueda, tipo, estado, SKU, paginación) |
| `GET` | `/inventory/hus/:id` | 🔒 Detalle HU con genealogía, cortes, movimientos |
| `PUT` | `/inventory/hus/:id/relocate` | 🔒 Reubicar HU (actualiza ubicación + movimiento) |
| `GET` | `/inventory/zones` | 🔒 Listar zonas del almacén |
| `GET` | `/inventory/locations` | 🔒 Listar ubicaciones |
| `GET` | `/inventory/movements` | 🔒 Historial de movimientos |
| `GET` | `/inventory/suggest-hus` | 🔒 ⭐ Sugerencias inteligentes (ver sección 9) |

### 6.4 Reception (`/api/reception`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/reception` | 🔒 Listar recepciones (búsqueda, estado, paginación) |
| `GET` | `/reception/stats` | 🔒 Estadísticas de recepción |
| `GET` | `/reception/:id` | 🔒 Detalle de recepción |
| `POST` | `/reception` | 🔒 Registrar recepción (crea HUs automáticamente) |

**Flujo de recepción:**
1. Registrar supplier + OC + transportista
2. Agregar líneas por SKU (cantidad rollos × metraje)
3. El sistema genera 1 HU por rollo con código secuencial `HU-2026-XXXXX`
4. Asigna ubicaciones automáticamente en zona `ROLLOS_ENTEROS`
5. Registra `InventoryMovement` tipo `ENTRADA` por cada HU
6. Marca HUs como `etiquetaImpresa: false` para pendiente de etiquetado

### 6.5 Orders (`/api/orders`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/orders/stats` | 🔒 Estadísticas de pedidos por estado |
| `GET` | `/orders` | 🔒 Listar pedidos (búsqueda, estado, cliente, paginación) |
| `GET` | `/orders/:id` | 🔒 Detalle completo con líneas, asignaciones, reservas |
| `POST` | `/orders` | 🔒 Crear pedido (cotización) |
| `PUT` | `/orders/:id/status` | 🔒 Cambiar estado del pedido |
| `POST` | `/orders/lines/:lineId/assign` | 🔒 Asignar HU a línea (picking) |

### 6.6 Cutting (`/api/cutting`) ⭐

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/cutting/stats` | 🔒 Estadísticas de corte |
| `GET` | `/cutting` | 🔒 Listar operaciones de corte |
| `GET` | `/cutting/:id` | 🔒 Detalle de operación de corte |
| `POST` | `/cutting` | 🔒 Ejecutar corte (genera retazo + auto-ubicación) |

**Flujo de corte:**
1. Se recibe `huOrigenId` + `metrajeCorte`
2. Valida que el HU tenga metraje suficiente
3. Genera código `COR-2026-XXXXX`
4. Si queda retazo > 0:
   - Crea nuevo HU hijo (`tipoRollo: RETAZO`, `generacion: +1`)
   - Busca ubicación automática por rango de merma configurado
   - El retazo hereda `parentHuId` para trazabilidad
5. Actualiza HU origen: `metrajeActual -= metrajeCorte`
6. Registra `InventoryMovement` tipo `CORTE`
7. Marca assignment como `cortado: true`

### 6.7 Warehouse (`/api/warehouse`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/warehouse/stats` | 🔒 Estadísticas del almacén |
| `GET` | `/warehouse/warehouses` | 🔒 Listar almacenes (físicos + virtuales) |
| `GET` | `/warehouse/warehouses/:id` | 🔒 Detalle con zonas y ubicaciones |
| `POST` | `/warehouse/warehouses` | 🔒 Crear almacén |
| `PUT` | `/warehouse/warehouses/:id` | 🔒 Actualizar almacén |
| `GET` | `/warehouse/zones` | 🔒 Listar zonas |
| `POST` | `/warehouse/zones` | 🔒 Crear zona |
| `PUT` | `/warehouse/zones/:id` | 🔒 Actualizar zona |
| `GET` | `/warehouse/locations` | 🔒 Listar ubicaciones con filtros |
| `GET` | `/warehouse/locations/:id` | 🔒 Detalle de ubicación con HUs |
| `POST` | `/warehouse/locations` | 🔒 Crear ubicación individual |
| `POST` | `/warehouse/locations/bulk` | 🔒 Crear ubicaciones masivas |
| `PUT` | `/warehouse/locations/:id` | 🔒 Actualizar ubicación |
| `GET` | `/warehouse/suggest-location` | 🔒 Sugerir ubicación (por tipo rollo + metraje) |
| `GET` | `/warehouse/merma-ranges` | 🔒 Listar rangos de merma |
| `POST` | `/warehouse/merma-ranges` | 🔒 Crear rango de merma |
| `PUT` | `/warehouse/merma-ranges/:id` | 🔒 Actualizar rango de merma |

**Layout del almacén (Seed):**
- **RE-01** (Rollos Enteros): 5 pasillos × 3 racks × 5 niveles = 75 posiciones (cap: 6 HUs c/u)
- **MER-01** (Retazos 1-5m): 2 × 3 × 3 = 18 posiciones (cap: 10)
- **MER-02** (Retazos 6-10m): 18 posiciones (cap: 8)
- **MER-03** (Retazos 11-40m): 18 posiciones (cap: 4)
- **REC-01**: Muelle + Staging
- **CORTE-01**: 2 mesas de corte (cap: 10 c/u)
- **EMPAQUE-01**: 1 mesa de empaque (cap: 20)
- **EMB-01**: 1 muelle de embarque (cap: 30)

### 6.8 Reservations (`/api/reservations`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/reservations` | 🔒 Listar reservas |
| `GET` | `/reservations/availability/:skuId` | 🔒 Disponibilidad por SKU |
| `POST` | `/reservations` | 🔒 Crear reserva blanda (24h) |
| `PUT` | `/reservations/:id/confirm` | 🔒 Confirmar → firme |
| `PUT` | `/reservations/:id/cancel` | 🔒 Cancelar reserva |

### 6.9 Transit (`/api/transit`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/transit` | 🔒 Listar embarques en tránsito |
| `GET` | `/transit/stats` | 🔒 Estadísticas de tránsito |
| `GET` | `/transit/:id` | 🔒 Detalle de embarque |
| `POST` | `/transit` | 🔒 Crear embarque (OC + líneas + ETA) |
| `PUT` | `/transit/:id/received` | 🔒 Marcar como recibido |

### 6.10 Packing (`/api/packing`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/packing/stats` | 🔒 Estadísticas de empaque |
| `GET` | `/packing/orders` | 🔒 Pedidos listos para empacar (EMPACADO) |
| `GET` | `/packing/slips` | 🔒 Listar packing slips |
| `GET` | `/packing/slips/:id` | 🔒 Detalle de packing slip |
| `POST` | `/packing/slips` | 🔒 Crear packing slip |
| `PUT` | `/packing/orders/:orderId/approve` | 🔒 Aprobar → FACTURADO |

### 6.11 Shipping (`/api/shipping`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/shipping/stats` | 🔒 Estadísticas de envío |
| `GET` | `/shipping/orders` | 🔒 Pedidos FACTURADOS listos para despacho |
| `GET` | `/shipping/shipments` | 🔒 Listar envíos |
| `GET` | `/shipping/shipments/:id` | 🔒 Detalle de envío |
| `POST` | `/shipping/dispatch` | 🔒 Despachar → crea envío + estado DESPACHADO |
| `PUT` | `/shipping/shipments/:id/confirm-delivery` | 🔒 Confirmar entrega |

### 6.12 Transfers (`/api/transfers`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/transfers` | 🔒 Listar transferencias |
| `GET` | `/transfers/stats` | 🔒 Estadísticas |
| `GET` | `/transfers/:id` | 🔒 Detalle |
| `POST` | `/transfers` | 🔒 Crear transferencia (seleccionar HUs) |
| `PUT` | `/transfers/:id/execute` | 🔒 Ejecutar (solo nivel ≤ 2) |
| `PUT` | `/transfers/:id/receive` | 🔒 Confirmar recepción |
| `PUT` | `/transfers/:id/cancel` | 🔒 Cancelar (solo nivel ≤ 2) |

### 6.13 Admin (`/api/admin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/admin/users` | 🔒 Listar usuarios |
| `GET` | `/admin/users/:id` | 🔒 Detalle de usuario |
| `POST` | `/admin/users` | 🔒 Crear usuario |
| `PUT` | `/admin/users/:id` | 🔒 Actualizar usuario |
| `DELETE` | `/admin/users/:id` | 🔒 Desactivar usuario |
| `PUT` | `/admin/users/:id/reset-password` | 🔒 Resetear password |
| `GET` | `/admin/roles` | 🔒 Listar roles con permisos |
| `GET` | `/admin/roles/:id` | 🔒 Detalle de rol |
| `POST` | `/admin/roles` | 🔒 Crear rol |
| `PUT` | `/admin/roles/:id/permissions` | 🔒 Actualizar permisos |
| `GET` | `/admin/settings` | 🔒 Configuraciones del sistema |
| `PUT` | `/admin/settings` | 🔒 Actualizar configuración |

---

## 7. PWA Mobile (Zebra TC22)

### Diseño

La PWA está optimizada para dispositivos handheld **Zebra TC22** con pantalla touch de 5.5". Usa un layout separado con modo oscuro (`bg-gray-900`) para mejor visibilidad en almacén.

### Rutas

| Ruta | Vista | Descripción |
|------|-------|-------------|
| `/zebra` | `ZebraLayout` | Layout contenedor con tabs + status WiFi |
| `/zebra/picker` | `PickerView` | Modo Picker — surtido de pedidos |
| `/zebra/cortador` | `CortadorView` | Modo Cortador — corte de rollos |

### Flujo Picker (`/zebra/picker`)

```
1. Ver lista de pedidos POR_SURTIR + EN_SURTIDO
2. Seleccionar pedido → cambia estado a EN_SURTIDO
3. Ver líneas del pedido con barra de progreso
4. Escanear código del rollo (búsqueda por código HU)
5. Asignar HU escaneado a línea del pedido
6. Repetir hasta completar todas las líneas
7. Enviar a Corte (estado → EN_CORTE)
```

### Flujo Cortador (`/zebra/cortador`)

```
1. Ver lista de pedidos EN_CORTE
2. Seleccionar pedido → ver líneas con assignments
3. Escanear rollo a cortar
4. Ingresar metros a cortar (validación max metraje actual)
5. Ver preview del retazo restante en tiempo real
6. Ejecutar corte → POST /cutting
7. Marcar como Empacado cuando todas las líneas estén completas
```

### Características Touch-Optimized

- Botones mínimo 48px touch target
- `active:scale-[0.98]` feedback visual en botones
- Esquinas redondeadas `rounded-2xl` para estilo mobile
- Gradientes premium en botones de acción
- Input de corte `text-2xl font-bold text-center` para fácil lectura
- Color coding: Azul (picking), Púrpura (corte), Verde (completado)
- Indicador WiFi online/offline en header

---

## 8. Integración CONTPAQi Cloud (Fase 2)

### Estado Actual: Preparado

La arquitectura incluye los modelos de integración pero la conexión activa con CONTPAQi Cloud está pendiente.

### Modelos Preparados

- `IntegrationConfig` — Almacena configuración de API (url, key, company)
- `SyncLog` — Log de sincronización bidireccional

### Campos de Pedido para CONTPAQi

| Campo | Uso |
|-------|-----|
| `folioContpaqi` | Folio del pedido en CONTPAQi (PE XXXXXX) |
| `facturaRef` | Referencia de factura emitida |
| `facturaLista` | Boolean — factura lista para enviar |
| `referenciaPago` | Número de referencia de pago |
| `comprobantePago` | Path del comprobante subido |

### Plan de Integración

```
Fase 2A: Lectura
- Sync SKUs desde CONTPAQi → catalog/skus
- Sync Clientes → catalog/clients
- Sync Folios de pedido

Fase 2B: Escritura  
- Push facturas desde WMS → CONTPAQi
- Sync movimientos de inventario
```

---

## 9. Sistema de Sugerencias Inteligentes

### Endpoint: `GET /api/inventory/suggest-hus`

**Parámetros:** `skuId` (UUID), `metraje` (number), `limit` (number, default 10)

### Algoritmo de Fulfillment Plan (Combinatorio)

El sistema no solo sugiere HUs individuales — genera un **plan de surtido óptimo** que combina múltiples HUs para cubrir el metraje requerido:

```
Paso 1: Retazos primero (consumir piezas pequeñas antes de abrir rollos)
         → Ordena por metraje ASC, toma retazos que estén dentro de tolerancia

Paso 2: Rollos enteros FIFO (más viejos primero)
         → Usa rollos completos si se necesitan

Paso 3: Retazo de cierre
         → Si queda un gap, busca el retazo más cercano al metraje faltante

Paso 4: Inventario en tránsito
         → Si el físico no alcanza, incluye embarques entrantes ordenados por ETA
```

### Ranking de Sugerencias Individuales

```
Prioridad:
1. 🎯 Coincidencia exacta (metraje == requerido)
2. ✨ Retazo ideal — merma ≤3m
3. 👍 Buen retazo — merma ≤10m
4. 📦 Retazo disponible — merma >10m
5. 🎯 Rollo entero (bajo desperdicio ≤5m)
6. 📦 Rollo entero
7. 🚛 Tránsito — llega mañana
8. 🚛 Tránsito — llega en ≤3 días
9. 🚛 Tránsito — llega en ≤7 días
10. 🚛 Tránsito — llega en >7 días
11. ⚠️ Insuficientes
```

### Exclusiones

- HUs en bodegas virtuales (`warehouse.tipo = 'VIRTUAL'`) → no aparecen en sugerencias
- HUs con estado ≠ `DISPONIBLE` → excluidos
- HUs con `metrajeActual = 0` → excluidos

### Respuesta

```json
{
  "suggestions": [...],           // Top N sugerencias individuales rankeadas
  "fulfillmentPlan": {
    "items": [...],               // Plan paso a paso
    "totalHUsFisicos": 2,
    "totalHUsTransito": 1,
    "metrajeFisico": 80,
    "metrajeTransito": 20,
    "totalCubierto": 100,
    "metrajeRequerido": 100,
    "gap": 0,
    "coberturaPct": 100,
    "status": "COMPLETO"          // COMPLETO | PARCIAL | SIN_STOCK
  },
  "totalAvailable": 8,
  "totalMetraje": 400,
  "transitAvailable": 2,
  "transitMetraje": 1500
}
```

---

## 10. Flujo de Inventario

### Flujo de Entrada

```
Proveedor → Recepción → HUs (auto-generados) → Ubicación (auto-asignada)
                ↓
         InventoryMovement
           tipo: ENTRADA
```

### Flujo de Pedido (9 estados)

```
ATC crea cotización ───────────────────────────────────────────────────→
  │
  ▼ COTIZADO (reserva BLANDA 24h)
  │
  ▼ POR_PAGAR (cliente aprobó → reserva FIRME)
  │
  ▼ PAGO_RECIBIDO (comprobante recibido)
  │
  ▼ POR_SURTIR (cobranza verificó pago)
  │                              ┌─────────── Zebra Picker ──────────┐
  ▼ EN_SURTIDO (picker tomó)     │ Escanear → Asignar HU → Línea    │
  │                              └────────────────────────────────────┘
  ▼ EN_CORTE                     ┌─────────── Zebra Cortador ────────┐
  │                              │ Escanear → Input metros → Cortar  │
  │                              │ HU origen se reduce               │
  │                              │ Retazo nuevo se genera            │
  │                              └────────────────────────────────────┘
  ▼ EMPACADO (listo para facturar)
  │
  ▼ FACTURADO (factura emitida en CONTPAQi)
  │
  ▼ DESPACHADO (salió del almacén)
```

### Flujo de Corte (Genealogía)

```
HU-2026-00001 (Enigma Iron, 50m, ENTERO, Gen:0)
  │
  ├── Corte 1: 41m para PED-2026-0004
  │     └── HU-2026-00031 (Enigma Iron, 9m, RETAZO, Gen:1)
  │           ubicación auto → MER-01 (retazo de 1-5m... oh wait, 9m → MER-02)
  │
  └── HU-2026-00001 ahora tiene metrajeActual=0, estadoHu=AGOTADO
```

### Ciclo de Ubicaciones

```
Ubicación LIBRE ──→ HU asignado ──→ PARCIAL ──→ Lleno ──→ OCUPADA
                                      ↓
                                    HU retirado
                                      ↓
                               ¿Vacía? ──→ LIBRE
                                  │
                                  └ No ──→ sigue PARCIAL
```

---

## 11. Sistema de Reservas (Anti Doble-Venta)

### Tipos de Reserva

| Tipo | Duración | Trigger | Efecto en HU |
|------|----------|---------|--------------|
| **BLANDA** | 24 horas | ATC crea cotización | `estadoHu → RESERVADO_BLANDO` |
| **FIRME** | Indefinida | Cliente aprobó | `estadoHu → RESERVADO` |

### Ciclo de Vida

```
ACTIVA ──→ CONVERTIDA (blanda → firme cuando cliente aprueba)
   │
   ├──→ EXPIRADA (automática a las 24h — libera HU)
   │
   ├──→ CANCELADA (manual — libera HU)
   │
   └──→ SURTIDA (pedido despachado — cierra reserva)
```

### Características

- **Reserva de stock físico:** `huId` apunta a un HU disponible
- **Reserva de tránsito:** `shipmentLineId` apunta a metraje de un embarque entrante
- **Campo `metrajeReservado`:** Metros específicos reservados (puede ser parcial si el HU tiene más)
- **Auto-expiración:** Las reservas blandas con `expiresAt` son liberadas automáticamente

---

## 12. Transferencias entre Almacenes

### Concepto

Permite mover HUs entre almacenes (Nave Formatex → Bodega Virtual Liverpool). Los HUs transferidos a bodegas virtuales quedan **reservados para ese cliente** y no aparecen en sugerencias de cotización.

### Flujo

```
1. Crear: Seleccionar almacén origen, destino, motivo + HUs
2. Ejecutar (solo supervisores nivel ≤ 2):
   - Cambia ubicación de cada HU
   - Registra InventoryMovement tipo TRANSFERENCIA
   - Si destino es bodega VIRTUAL → marca HU como RESERVADO
3. Recibir: Confirmar recepción en destino
4. Cancelar: Solo supervisores
```

### Restricciones

- Solo usuarios con `rol.nivel ≤ 2` pueden ejecutar y cancelar
- Los HUs deben estar `DISPONIBLES` para ser transferidos
- Snapshots de datos (código HU, nombre SKU, metraje, tipo) se guardan en `TransferLine`

---

## 13. Seguridad y Autenticación

### JWT

| Parámetro | Valor |
|-----------|-------|
| Algoritmo | HS256 |
| Secret | `JWT_SECRET` (env var) |
| Payload | `{ sub, username, role, nivel }` |
| Extracción | `Authorization: Bearer {token}` |
| Guard | `JwtAuthGuard` (Passport) |

### RBAC (Role-Based Access Control)

**9 Roles pre-configurados:**

| Rol | Nivel | Módulos |
|-----|-------|---------|
| `DIRECTOR_OPERACIONES` | 1 | Todos (13 módulos) |
| `COORDINADOR_ALMACEN` | 2 | dashboard, inventory, orders, cutting, reception, labeling, warehouse, reservations, transit |
| `ATC` | 3 | dashboard, orders, catalogs, inventory, reservations, transit |
| `COBRANZA` | 3 | dashboard, orders, cobranza |
| `FACTURACION` | 3 | dashboard, orders, facturacion |
| `PICKER` | 4 | dashboard, inventory, orders, labeling |
| `CORTADOR` | 4 | dashboard, inventory, cutting, orders, labeling |
| `EMPACADOR` | 4 | dashboard, orders |
| `DESPACHADOR` | 4 | dashboard, orders |

**Regla de visibilidad del Sidebar:** Nivel ≤ 2 ven todos los módulos. Nivel 3-4 ven solo los módulos asignados.

**Permisos granulares:** Cada módulo tiene 4 acciones: `read`, `create`, `update`, `delete`.

### Usuarios Seed

| Username | Password | Rol |
|----------|----------|-----|
| `admin` | `admin123` | DIRECTOR_OPERACIONES |
| `yareni.atc` | `opera123` | ATC |
| `sandra.cobr` | `opera123` | COBRANZA |
| `luis.fact` | `opera123` | FACTURACION |
| `juan.picker` | `opera123` | PICKER |
| `maria.corte` | `opera123` | CORTADOR |
| `pedro.empaque` | `opera123` | EMPACADOR |
| `ana.envio` | `opera123` | DESPACHADOR |
| `roberto.coord` | `opera123` | COORDINADOR_ALMACEN |

### CORS

```typescript
origin: [
  'http://localhost:5173',   // Vite dev
  'http://localhost:5174',   // Vite alt port
  'http://localhost:3000',   // Local prod
  /\.vercel\.app$/,          // Vercel deployments
]
```

### Validation

- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`
- `transform: true` con conversión implícita de tipos

### Auditoría

Cada acción importante se registra en `AuditLog` con:
- `userId` — Quién
- `accion` — Qué (LOGIN, CREATE_HU, CUT_ROLL, etc.)
- `entidad` — Modelo afectado
- `entidadId` — ID del registro
- `detalle` — JSON con contexto
- `ip` — IP del cliente

---

## 14. Comandos Útiles

### Desarrollo

```bash
# Backend
cd wms-backend
npm run start:dev          # NestJS watch mode (port 3000)
npm run start:debug        # Debug mode con inspector

# Frontend
cd wms-frontend
npm run dev                # Vite dev server (port 5173)
npm run build              # Build para producción
npm run preview            # Preview del build
```

### Base de Datos

```bash
# Prisma
cd wms-backend
npx prisma generate        # Regenerar cliente Prisma
npx prisma db push          # Push schema a DB (sin migraciones)
npx prisma migrate dev      # Crear migración
npx prisma studio           # GUI de base de datos
npx ts-node prisma/seed.ts  # Ejecutar seed

# Reset completo
npx prisma db push --force-reset && npx ts-node prisma/seed.ts
```

### Verificación

```bash
# TypeScript
cd wms-backend && npx tsc --noEmit     # Verificar compilación backend
cd wms-frontend && npx tsc -b          # Verificar compilación frontend

# Lint
cd wms-backend && npm run lint
cd wms-frontend && npm run lint
```

### Swagger

```
http://localhost:3000/api/docs    # Swagger UI interactivo
```

---

## 15. Troubleshooting

### Error: "Credenciales inválidas" al login

**Causa:** Password no hasheado con bcrypt o usuario inactivo.  
**Solución:** Re-ejecutar seed: `npx ts-node prisma/seed.ts`

### Error: "Connection pool timeout" en Supabase

**Causa:** Demasiadas conexiones simultáneas al pooler.  
**Solución:** El `PrismaService` ya está configurado con `max: 3` conexiones. Verificar que no haya procesos zombie.

```typescript
// prisma.service.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, // Supabase pooler has 15 max
});
```

### Frontend: 401 en todas las peticiones

**Causa:** Token JWT expirado o inválido en localStorage.  
**Solución:** El interceptor de Axios detecta 401 y hace `logout()` automáticamente. Si persiste:
```javascript
localStorage.removeItem('wms360_auth');
```

### Error: "Cannot find module '@prisma/client'"

**Causa:** `prisma generate` no se ha ejecutado después de cambiar el schema.  
**Solución:** 
```bash
npx prisma generate
```

### Vite proxy no funciona

**Causa:** El backend no está corriendo en el puerto 3000.  
**Solución:** Verificar que `nest start --watch` esté activo y escuchando en `PORT=3000`.

### HU no aparece en sugerencias

**Causas posibles:**
1. `estadoHu ≠ DISPONIBLE` (está reservado, en corte, etc.)
2. `metrajeActual = 0` (agotado)
3. HU está en bodega virtual (`warehouse.tipo = 'VIRTUAL'`)

---

## 16. Changelog v2.0

### Nuevas Funcionalidades

- ✅ **Sistema de Sugerencias Inteligentes** — Algoritmo combinatorio de surtido con plan de fulfillment
- ✅ **Inventario en Tránsito** — Embarques entrantes con ETA, visibles en sugerencias
- ✅ **Reservas Blanda/Firme** — Anti doble-venta con expiración automática
- ✅ **Módulo de Transferencias** — Movimiento de HUs entre almacenes (físicos y virtuales)
- ✅ **PWA Zebra TC22** — Vistas touch-optimized para Picker y Cortador
- ✅ **Genealogía de Cortes** — Trazabilidad padre→hijo con generaciones
- ✅ **Auto-ubicación de Retazos** — Asignación automática por rangos de merma configurados
- ✅ **9 Estados de Pedido** — Flujo real de Formatex (COTIZADO → DESPACHADO)
- ✅ **RBAC Granular** — Permisos por módulo × acción con 9 roles
- ✅ **Bodegas Virtuales** — HUs reservados por cliente (Liverpool, Zara)
- ✅ **Empaque y Envío** — Packing slips + despacho con guía y transportista
- ✅ **Swagger API** — Documentación interactiva en `/api/docs`

### Stack Actualizado

- React 19.2 + TypeScript 6.0
- NestJS 11 + Prisma 7.7
- Vite 8.0 + Tailwind CSS 4.2
- TanStack Query 5.99

### Métricas

| Métrica | Valor |
|---------|-------|
| Archivos TypeScript | 89 |
| Líneas de código | ~11,459 |
| Modelos Prisma | 26 |
| Endpoints REST | ~75 |
| Roles del sistema | 9 |
| Usuarios seed | 9 |
| Ubicaciones seed | 135 |
| HUs seed | 31 |
| Pedidos seed | 5 (en 5 estados diferentes) |
