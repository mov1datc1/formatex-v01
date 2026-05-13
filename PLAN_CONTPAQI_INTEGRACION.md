# Plan: WMS 360+ con CONTPAQi Cloud — Investigación y Viabilidad

## Objetivo

Evaluar la integración del WMS 360+ con CONTPAQi para sincronizar:
- **Cotizaciones / Pedidos** → traer al WMS
- **Órdenes de Compra** → ingresar stock/mercancía al almacén
- **Facturación** → delegar a CONTPAQi (desactivar Facturapi)

El plan incluye duplicar el repositorio actual en un nuevo repo/carpeta para crear una versión **"WMS + CONTPAQi"** independiente.

---

## Hallazgos de la Investigación

### 1. CONTPAQi Nube — Portal de Desarrolladores

| Dato | Detalle |
|------|---------|
| **Portal** | https://developers.contpaqinube.com/ |
| **Infraestructura** | Azure API Management |
| **Auth** | `License-Code` + `Subscription-Key` (header) |
| **Formato** | REST + JSON |
| **Sandbox** | ✅ Sí — ambiente de pruebas con claves secundarias |
| **Registro** | Gratis (sign up en el portal) |

> [!IMPORTANT]
> Las APIs públicas del portal oficial actualmente solo exponen **Timbra v2 / v3** (timbrado y cancelación de CFDIs). **No hay endpoints nativos para pedidos, cotizaciones ni inventarios** directamente desde CONTPAQi Nube.

### 2. CONTPAQi Comercial Premium (Desktop)

| Dato | Detalle |
|------|---------|
| **Tipo** | Software de escritorio (Windows) |
| **SDK** | Componentes COM / DLLs (.NET) |
| **Funcionalidades** | CRUD completo: Clientes, Productos, Proveedores, Cotizaciones, Pedidos, Órdenes de Compra, Facturas, Inventarios |
| **API REST Nativa** | ❌ **No existe** |
| **Requisito** | El sistema debe estar instalado y la empresa abierta en un servidor Windows |

### 3. Opciones de Integración

#### Opción A: AR Software — API REST Wrapper (Recomendada)

| Dato | Detalle |
|------|---------|
| **Proveedor** | AR Software (Andrés Ramos) — arsoft.net |
| **Producto** | `ARSoftware.Contpaqi.Comercial.Api` |
| **GitHub** | Repos públicos + Wiki con docs |
| **Tecnología** | .NET Core — Web Service local que consume el SDK de CONTPAQi |
| **Precio** | **$720 USD/año por RFC** |
| **Funcionalidades** | CRUD documentos (cotizaciones, pedidos, OC, facturas), catálogos, inventarios |
| **Requisito** | CONTPAQi Comercial Premium instalado + licencia AR Software |

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│                  │  REST  │  AR Software API  │  SDK   │   CONTPAQi       │
│  WMS 360+        │◄──────►│  (.NET Core)      │◄──────►│   Comercial      │
│  (NestJS)        │  JSON  │  Puerto local     │  COM   │   Premium        │
│                  │        │  o túnel           │        │   (Windows)      │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

#### Opción B: Desarrollo Propio — Wrapper .NET

- Desarrollar un servicio .NET Core propio que consuma el SDK de CONTPAQi
- Exponer endpoints REST que el WMS consuma
- **Pros**: Control total, sin costos de licencia de terceros
- **Contras**: Requiere experiencia en .NET + SDK CONTPAQi, mantenimiento propio ante actualizaciones

#### Opción C: CONTPAQi Nube + Timbrado API

- Usar solo el servicio de timbrado/cancelación de CONTPAQi Nube
- Los pedidos/OC se manejan 100% en el WMS
- **Pros**: Sin middleware, directo desde NestJS
- **Contras**: Solo cubre timbrado, no sincronización bidireccional de documentos

> [!WARNING]
> **No existe versión gratuita de CONTPAQi Comercial Premium.** Se requiere licencia (~$8,000-15,000 MXN/año según versión). Para obtener un demo/trial, hay que contactar a un Distribuidor Certificado CONTPAQi.

---

## Plan de Ejecución Propuesto

### Fase 0: Preparación del Repositorio

- [ ] Duplicar el repo `formatex-v01` en un nuevo repo (ej: `formatex-contpaqi`)
- [ ] Clonar localmente en nueva carpeta
- [ ] Desactivar módulo de Facturación (Facturapi) — quitar env vars, deshabilitar rutas
- [ ] Renombrar el proyecto/branding para distinguir ambas versiones
- [ ] Configurar nuevo deploy (Render + Vercel separados)

### Fase 1: Investigación en Profundidad

- [ ] Registrarse en https://developers.contpaqinube.com/ (gratis)
- [ ] Explorar APIs disponibles (Timbra v2/v3) y documentación
- [ ] Contactar a AR Software (arsoft.net) para:
  - Demo de la API REST
  - Confirmar si hay trial/sandbox gratuito
  - Obtener docs de endpoints disponibles
- [ ] Evaluar si el cliente ya tiene CONTPAQi Comercial Premium instalado
- [ ] Definir si el server Windows estará en la misma red o se necesita túnel (Cloudflare Tunnel, ngrok, VPN)

### Fase 2: Diseño de Arquitectura

- [ ] Definir qué datos se sincronizan y en qué dirección:

| Entidad | Dirección | Descripción |
|---------|-----------|-------------|
| Clientes | CONTPAQi → WMS | Catálogo maestro de clientes |
| Productos/SKUs | CONTPAQi → WMS | Catálogo de telas |
| Cotizaciones | CONTPAQi → WMS | Ingreso de demanda |
| Pedidos | CONTPAQi → WMS | Órdenes confirmadas |
| Órdenes de Compra | CONTPAQi → WMS | Trigger de recepción en almacén |
| Facturas | WMS → CONTPAQi | Datos para facturación (o directo en CONTPAQi) |
| Inventario | WMS → CONTPAQi | Existencias actualizadas |

- [ ] Diseñar nuevo módulo NestJS: `contpaqi-sync`
- [ ] Definir tabla `SyncLog` para auditoría de sincronizaciones
- [ ] Cron jobs para polling periódico o webhooks si los soporta

### Fase 3: Implementación

- [ ] Instalar AR Software API en server Windows del cliente
- [ ] Crear módulo `contpaqi-sync` en el backend NestJS
- [ ] Implementar sync de catálogos (clientes, productos)
- [ ] Implementar sync de documentos (cotizaciones → pedidos)
- [ ] Implementar sync de OC → recepción de mercancía
- [ ] Testing end-to-end

---

## Open Questions (para el usuario)

> [!IMPORTANT]
> **Antes de comenzar a codificar**, necesito confirmar lo siguiente:

1. **¿El cliente ya tiene licencia de CONTPAQi Comercial Premium?** Si no, ¿cuál versión planean usar? (Start, Premium, Nube)
2. **¿Tienen un servidor Windows disponible?** — Necesario para instalar el SDK y el middleware REST
3. **¿Presupuesto para AR Software?** — $720 USD/año, o ¿prefieren wrapper propio (.NET)?
4. **¿La facturación se haría 100% en CONTPAQi?** — Entonces desactivamos Facturapi completamente
5. **¿Nombre del nuevo repo?** — Sugerencia: `formatex-contpaqi` o `wms-contpaqi-v01`
6. **¿Quieren mantener ambas versiones en paralelo?** (Facturapi para Formatex, CONTPAQi para otro cliente)
