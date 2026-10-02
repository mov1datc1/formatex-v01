# Guía de Validación Operativa — WMS 360+ Formatex

**Documento:** Guía de Pruebas y Validación Paso a Paso  
**Proyecto:** WMS 360+ Formatex (FORMA TEXTIL S. DE R.L. DE C.V.)  
**Fecha:** Octubre 2026  
**Versión:** 1.0  

---

## 🔑 1. Credenciales de Acceso Demo

| Usuario | Contraseña | Rol en Sistema | Alcance / Permisos |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **DIRECTOR_OPERACIONES** | Acceso total a todos los módulos |
| `fernando.compras` | `opera123` | **DIRECTOR_COMPRAS** | Compras, Tránsito, Planificación y Catálogos |
| `roberto.coord` | `opera123` | **COORDINADOR_ALMACEN** | Inventario, Rollos, Ubicaciones y Corte |
| `yareni.atc` | `opera123` | **ATC** | Pedidos, Disponibilidad y Tránsito |

---

## 🌐 2. Mapa de Rutas del Sistema

| Módulo / Función | Ruta Local | Ruta en Producción (Vercel) |
| :--- | :--- | :--- |
| **Rollos e Inventario HU** | `http://localhost:5173/inventario/rollos` | `/inventario/rollos` |
| **Planificación & Resurtido** | `http://localhost:5173/planificacion` | `/planificacion` |
| **Catálogo de Telas y Muestrarios** | `http://localhost:5173/catalogos` | `/catalogos` |
| **Compras y Órdenes de Compra** | `http://localhost:5173/compras` | `/compras` |
| **Disponibilidad de Stock** | `http://localhost:5173/disponibilidad` | `/disponibilidad` |
| **Embarques en Tránsito** | `http://localhost:5173/transito` | `/transito` |
| **Almacén y Ubicaciones** | `http://localhost:5173/almacen` | `/almacen` |
| **Escáner Zebra (Móvil/TC22)** | `http://localhost:5173/zebra/rollos` | `/zebra/rollos` |

---

## 📋 3. Protocolo de Pruebas de los 5 Pilares

---

### PILAR 1: Existencias por Almacén en Tiempo Real por Rollo (HU)

#### Objetivo
Demostrar que el WMS controla el inventario a nivel de rollo físico individual (Unidad de Manipulación o HU) con código de barras, metraje vivo y asignación por almacén (`Nave Central`, `Almacén 9`, `Bodegas Virtuales`).

#### Paso a Paso:
1. Inicia sesión con el usuario `admin` o `roberto.coord`.
2. Dirígete a **Inventario** ➔ **Rollos / HUs** (`/inventario/rollos`).
3. **Observa la tabla maestra de rollos:**
   - Cada renglón corresponde a una HU única con código de barras (ej. `HU-2026-00001`, `HU-2026-00002`).
   - Muestra el **Código de Tela (SKU)**, **Metraje Actual** (ej. `50.00 m`) y su **Ubicación Física exacta** (ej. `RE-01-P01-R01-N1` en Rack de Nave Principal).
4. **Validación de Búsqueda y Escaneo en Piso:**
   - En la barra de búsqueda superior, digita o escanea cualquier código (ej. `HU-2026-00003` o `LENIGIRO`).
   - El filtrado es en tiempo real.
   - En dispositivos Handheld Zebra TC22 (o en la ruta móvil `/zebra/rollos`), el operador escanea el código de barras y el WMS despliega la ficha del rollo y su posición en pasillo/rack.
5. **Validación de Múltiples Almacenes:**
   - Ve a **Almacén** ➔ **Ubicaciones** (`/almacen`).
   - Podrás observar la separación entre almacenes físicos (`Nave Formatex NAV-001`) y bodegas virtuales/secundarias (`Bodega Virtual Liverpool`, `Bodega Virtual Zara`, etc.).

---

### PILAR 2: Calidad y Restringido (Bloqueo Comercial y Aislamiento)

#### Objetivo
Comprobar que cada rollo cuenta con clasificación de calidad (`PRIMERA`, `CALIDAD_A`, `CALIDAD_B (-20%)`, `CALIDAD_C (-40%)`, `CALIDAD_D (-60%)`) o estatus `RESTRINGIDO`, garantizando que la tela apartada o con tara **no** se considere disponible para venta regular ni interfiera en el surtido estándar.

#### Paso a Paso:
1. Dirígete a **Inventario** ➔ **Rollos / HUs** (`/inventario/rollos`).
2. **Revisa la Columna de Calidad en la Tabla:**
   - 🟢 `PRIMERA` (Verde esmeralda — apto para venta regular).
   - 🔵 `CALIDAD_A` (Azul).
   - 🟡 `CALIDAD_B (-20%)` (Ámbar con descuento sugerido).
   - 🟠 `CALIDAD_C (-40%)` (Naranja con descuento sugerido).
   - 🟣 `CALIDAD_D (-60%)` (Púrpura con descuento sugerido).
   - 🔴 `🔒 RESTRINGIDO` (Rojo con icono de candado — bloqueado para venta).
3. **Simular Bloqueo Comercial de un Rollo (Dato Demo):**
   - Haz clic sobre cualquier rollo de la tabla (ej. `HU-2026-00002`).
   - Se desplegará el panel lateral de detalle del rollo.
   - En el selector **"Grado de Calidad / Bloqueo Comercial"**, selecciona:
     - `🔒 RESTRINGIDO (Bloqueado comercialmente / Tara)` o `CALIDAD_B (-20% Descuento Tara)`.
   - Haz clic en **Guardar Calidad**.
   - Aparecerá la notificación: `✅ Calidad de rollo actualizada`.
4. **Validación del Filtro Superior:**
   - En el filtro superior junto al buscador, cambia de *"Todas las calidades"* a:
     - *"Solo Disponibles (1ª Calidad)"* ➔ El rollo bloqueado se oculta inmediatamente.
     - *"RESTRINGIDO (Bloqueado)"* ➔ Se lista únicamente la tela apartada.
5. **Validación de Blindaje en Surtido y Corte:**
   - Al levantar órdenes de corte en `/corte` o asignar rollos a un pedido en `/pedidos`, el algoritmo del WMS (`suggestHUs`) **descarta automáticamente** cualquier rollo que tenga `calidadRestringida: true` o grado diferente a `PRIMERA`.

---

### PILAR 3: Tránsitos y Compras ($S+P+T$ y Fechas ETA)

#### Objetivo
Registrar los pedidos colocados a proveedores con sus fechas estimadas de arribo (ETA), sumándolos automáticamente a la disponibilidad futura proyectada.

#### Paso a Paso:
1. Entra a **Compras** (`/compras`).
2. Haz clic en **"+ Nueva Orden de Compra"** e ingresa los siguientes datos demo:
   - **Proveedor:** `Textiles del Norte S.A.` (o `PROV-001`)
   - **Fecha Entrega Estimada (ETA):** Selecciona una fecha a 30 días (ej. `30/10/2026`)
   - **SKU:** `LENIGIRO` (*Enigma Iron*)
   - **Cantidad:** `600 metros` (o 12 rollos de 50 m)
   - **Precio Unitario:** `$107.28`
   - Guarda la Orden de Compra.
3. Ve a **Ventas / ATC** ➔ **Tránsito** (`/transito`):
   - Se muestra la orden de compra en tránsito con su transportista, días restantes y ETA visible para el equipo comercial.
4. **Verificación de la Disponibilidad Futura ($S+P+T$):**
   - Ve a **Planificación** (`/planificacion`).
   - Ubica la fila de `LENIGIRO`.
   - Revisa las columnas:
     - **Stock Nave (Alm 1):** Ej. `400.00 m`
     - **Tránsito (M):** Aparecerán los `600.00 m` en camino con su fecha ETA.
     - **Tendremos ($S+P+T$):** El sistema calcula automáticamente:
       $$\text{Tendremos} = 400 + 0 + 600 = \mathbf{1,000.00\text{ m}}$$
     - No requiere sumas manuales en Excel.

---

### PILAR 4: Muestrarios (Libros de Colección) en Piezas (`PZA`)

#### Objetivo
Controlar los libros y muestrarios dentro del catálogo maestro bajo su unidad de pieza (`PZA`), organizados por su colección textil correspondiente.

#### Paso a Paso:
1. Ve a **Catálogos** ➔ pestaña **Telas (SKUs)** (`/catalogos`).
2. Haz clic en **"+ Nuevo"**.
3. Captura los siguientes **Datos Demo de Muestrario**:
   - **Código:** `LIB-AMALFI-2026`
   - **Nombre:** `Libro Muestrario Colección Amalfi`
   - **Tipo de Artículo:** Selecciona `📚 Muestrario / Libro (PZA)` *(el campo de Unidad de Medida cambia automáticamente a `PZA`)*.
   - **Unidad de Medida:** `PZA`
   - **Colección / Libro Asignado:** `COLECCIÓN AMALFI`
   - **Categoría:** `Muestrarios`
   - **Metraje Estándar / Pzas x Paq:** `1`
4. Haz clic en **"Crear Registro"**.
5. **Comprobación en Tabla:**
   - El artículo aparece con su badge morado `📚 MUESTRARIO`.
   - Columna **Colección / Libro:** `COLECCIÓN AMALFI`.
   - Columna **U.M.:** `PZA`.
6. *(Opcional)* Si das de alta una tela asociada (ej. Código: `AMAL-AZUL`, Nombre: `Amalfi Azul Cielo`, Tipo: `🧵 Tela (MTR)`, Colección: `COLECCIÓN AMALFI`), ambas quedan vinculadas en el sistema bajo la misma colección para el resurtido.

---

### PILAR 5: Motor de Planificación y Resurtido (Fórmula Master + Ajuste Ricardo)

#### Objetivo
Replicar la fórmula de Andrea y Ricardo:
$$\text{TENDREMOS } (S+P+T) \quad \text{vs.} \quad \text{NECESITAREMOS } (\text{Promedio } 4M \times 4.5)$$
Dictaminar el estatus (`OK` vs. `RESURTIR`), calcular la sugerencia de rollos enteros y permitir a Ricardo sobreescribir la cantidad final en el campo **"Ajuste Ricardo"**.

#### Paso a Paso:
1. Dirígete a **Planificación** (`/planificacion`).
2. En la parte superior encontrarás dos pestañas:
   - **Plan de Abastecimiento & Resurtido (Master)**
   - **Histórico 13 Meses (CONTPAQi / SAT)**

#### A. Revisión de la Matriz de Resurtido:
La tabla replica los encabezados del archivo Excel de Formatex:
- **Colección / Libro** (ej. `LIBRO AMALFI`, `CASSIS`, `FORMENTERA`).
- **Código y Descripción del SKU**.
- **Stock Nave (Alm 1)** + **Alm 9 / Tránsitos**.
- **Tránsito Proveedores** (con fecha ETA).
- **Tendremos ($S+P+T$)**.
- **4M Prom Vta** (Consumo mensual promedio de los últimos 4 meses).
- **Proy 4.5M** ($4M\text{ Prom} \times 4.5$).
- **Decisión**:
  - `✅ OK` si $\text{Tendremos} \ge \text{Proy 4.5M}$.
  - `⚠️ RESURTIR` si $\text{Tendremos} < \text{Proy 4.5M}$.
- **Sugerido (M)**: Rollos enteros redondeados necesarios para cubrir el déficit.
- **Ajuste Ricardo**: Input numérico editable con botón `💾`.

#### B. Probar el "Ajuste Ricardo" (Dirección):
1. En cualquier fila con estatus `⚠️ RESURTIR`, ubica la columna **Ajuste Ricardo**.
2. Escribe una cantidad manual (ej. `500`).
3. Presiona la tecla **Enter** o el botón del disquete `💾`.
4. El sistema guarda la decisión en la base de datos y muestra:
   `✅ Ajuste de Dirección guardado para [Código]`.
5. Al hacer clic en el botón superior **"Generar Orden de Compra"**, el sistema utiliza prioritariamente el valor fijado en **Ajuste Ricardo** para crear el borrador de la orden en el módulo de compras.

#### C. Probar la Ingesta de Facturación Histórica (13 Meses):
1. Haz clic en la pestaña **"Histórico 13 Meses (CONTPAQi / SAT)"**.
2. Verás la matriz de consumo mes a mes desplegada por SKU (desde hace 13 meses hasta la fecha actual).
3. Haz clic en el botón verde **"Ingesta XML Facturación"**:
   - Permite arrastrar uno o múltiples archivos XML (facturas de venta timbradas del SAT o CONTPAQi).
   - El sistema extrae al vuelo la fecha de emisión, el código de tela y los metros facturados, alimentando la matriz histórica sin captura manual.
   - También permite editar o capturar consumos de cualquier mes con el botón de edición rápida por fila.

---

## 🚀 4. Arquitectura de Despliegue en la Nube

- **Backend (NestJS + Prisma):** Despliegue automático en **Render** desde la rama `dev`.
- **Frontend (React + Vite):** Despliegue automático en **Vercel** desde la rama `main`.
- **Base de Datos:** PostgreSQL en Supabase.
- Cada commit empujado a `dev` y fusionado a `main` activa de forma continua el pipeline de construcción y actualización en vivo.
