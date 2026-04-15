# 🚀 Guía de Deploy — WMS 360+ Formatex

**Backend → Render (Web Service)**  
**Frontend → Vercel (Static Site)**  
**Base de Datos → Supabase (ya configurada)**

---

## 📋 Resumen del Plan

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Render     │     │  Supabase    │
│              │     │              │     │              │
│  Frontend    │────▶│  Backend     │────▶│ PostgreSQL   │
│  React+Vite  │     │  NestJS API  │     │  (ya existe) │
│              │     │              │     │              │
│  :443 HTTPS  │     │  :443 HTTPS  │     │  :5432       │
└──────────────┘     └──────────────┘     └──────────────┘
  wms-formatex           wms-formatex        uscdzhxyvbei
  .vercel.app            -api.onrender.com   .supabase.co
```

---

## Paso 0: Preparar el Repositorio en GitHub

> ⚠️ **El proyecto NO tiene repositorio remoto aún.** Primero hay que subirlo.

### 0.1 Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Configurar:
   - **Repository name:** `wms-formatex-v2`
   - **Visibility:** Private
   - **NO** inicializar con README ni .gitignore (ya existen)
3. Click **Create repository**

### 0.2 Subir el código

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
cd /Users/jonathanpalacios/Downloads/wms-formatex-v2

# Inicializar git (si no existe)
git init

# Crear .gitignore raíz
cat > .gitignore << 'EOF'
node_modules
dist
.env
.DS_Store
*.local
/generated/prisma
EOF

# Agregar todo y hacer commit
git add .
git commit -m "feat: WMS 360+ Formatex v2.0 — initial deploy"

# Conectar con GitHub (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/wms-formatex-v2.git
git branch -M main
git push -u origin main
```

---

## Paso 1: Deploy del Backend en Render

### 1.1 Crear Web Service

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Conectar con GitHub:
   - Selecciona el repo `wms-formatex-v2`
   - Click **"Connect"**

### 1.2 Configuración del Web Service

Completa el formulario con estos valores **exactos**:

| Campo | Valor |
|-------|-------|
| **Name** | `wms-formatex-api` |
| **Region** | `Oregon (US West)` |
| **Branch** | `main` |
| **Root Directory** | `wms-backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install --include=dev && npx prisma generate && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Instance Type** | `Free` (o `Starter $7/mes` para evitar cold starts) |

> ⚠️ **IMPORTANTE:** El `Root Directory` debe ser `wms-backend` porque es un monorepo con frontend y backend separados.

### 1.3 Variables de Entorno en Render

Click en **"Advanced"** → **"Add Environment Variable"** y agrega estas 4 variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres.uscdzhxyvbeimnshsyhk:agl5b3ZFZdwBBNRJ@aws-1-us-west-2.pooler.supabase.com:5432/postgres` |
| `DIRECT_URL` | `postgresql://postgres:agl5b3ZFZdwBBNRJ@db.uscdzhxyvbeimnshsyhk.supabase.co:5432/postgres` |
| `JWT_SECRET` | `wms360-formatex-secret-key-2026` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

### 1.4 Click "Create Web Service"

Render va a:
1. Clonar el repo
2. `cd wms-backend`
3. `npm install` — instalar dependencias
4. `npx prisma generate` — generar cliente Prisma
5. `npm run build` — compilar NestJS → `dist/`
6. `npm run start:prod` → `node dist/main`

### 1.5 Verificar Deploy

Espera ~3-5 minutos. Cuando el status sea **"Live"**:

1. Copia la URL que te da Render, será algo como:
   ```
   https://wms-formatex-api.onrender.com
   ```

2. Verifica en el navegador:
   ```
   https://wms-formatex-api.onrender.com/api/docs
   ```
   Deberías ver el **Swagger UI** con todos los endpoints.

3. Prueba el login:
   ```bash
   curl -X POST https://wms-formatex-api.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

> 📝 **Anota la URL del backend**, la necesitas para el paso 2.

---

## Paso 2: Deploy del Frontend en Vercel

### 2.1 Importar Proyecto

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Selecciona el repo `wms-formatex-v2`
4. Click **"Import"**

### 2.2 Configuración del Proyecto

| Campo | Valor |
|-------|-------|
| **Project Name** | `wms-formatex` |
| **Framework Preset** | `Vite` (Vercel lo detecta automáticamente) |
| **Root Directory** | Click **"Edit"** → `wms-frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 2.3 Variables de Entorno en Vercel

Click **"Environment Variables"** y agrega:

| Key | Value | Environments |
|-----|-------|-------------|
| `VITE_API_URL` | `https://wms-formatex-api.onrender.com/api` | Production, Preview, Development |

> ⚠️ **IMPORTANTE:** Reemplaza `wms-formatex-api.onrender.com` con la URL real que te dio Render en el paso 1.5.

> ⚠️ **IMPORTANTE:** Incluye `/api` al final de la URL. Es el prefijo global del backend.

### 2.4 Click "Deploy"

Vercel va a:
1. Clonar el repo
2. `cd wms-frontend`
3. `npm install`
4. `npm run build` → `tsc -b && vite build`
5. Servir el directorio `dist/`

### 2.5 Verificar Deploy

Espera ~1-2 minutos. Cuando termine:

1. Vercel te dará una URL como:
   ```
   https://wms-formatex.vercel.app
   ```

2. Abre esa URL en el navegador
3. Deberías ver la página de **Login**
4. Inicia sesión con: `admin` / `admin123`

---

## Paso 3: Configurar CORS en el Backend

> ⚠️ **Este paso es CRÍTICO.** Sin esto, el frontend en Vercel no podrá comunicarse con el backend en Render.

### 3.1 Actualizar `main.ts`

Edita el archivo `wms-backend/src/main.ts` y actualiza la configuración CORS:

```typescript
// CORS — ACTUALIZAR con tus dominios reales
app.enableCors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://wms-formatex.vercel.app',       // ← TU URL DE VERCEL
    /\.vercel\.app$/,                         // ← Cualquier preview de Vercel
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
});
```

### 3.2 Push y Re-deploy

```bash
cd /Users/jonathanpalacios/Downloads/wms-formatex-v2
git add .
git commit -m "fix: add Vercel domain to CORS"
git push origin main
```

Render detecta el push automáticamente y re-deploya (~3-5 min).

---

## Paso 4: Configurar SPA Routing en Vercel

React Router usa rutas del lado del cliente. Sin esta config, al refrescar en `/pedidos` Vercel retorna 404.

### 4.1 Crear `vercel.json`

Crea el archivo `wms-frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4.2 Push

```bash
git add .
git commit -m "fix: SPA rewrites for Vercel"
git push origin main
```

---

## Paso 5: Ejecutar Seed (si la DB está vacía)

Si la base de datos de Supabase aún no tiene datos seed, ejecútalo localmente:

```bash
cd /Users/jonathanpalacios/Downloads/wms-formatex-v2/wms-backend
npx ts-node prisma/seed.ts
```

Esto creará:
- 3 almacenes (1 físico + 2 virtuales)
- 8 zonas, 135 ubicaciones
- 8 SKUs, 3 proveedores, 5 clientes, 3 vendedores
- 9 roles, 9 usuarios
- 31 HUs (rollos + retazos)
- 5 pedidos en 5 estados diferentes
- 2 embarques en tránsito
- 4 reservas (2 blandas + 2 firmes)

---

## Paso 6: Verificación Final

### Checklist

- [ ] **Render**: `https://wms-formatex-api.onrender.com/api/docs` muestra Swagger
- [ ] **Render**: Login funciona vía `curl` o Swagger
- [ ] **Vercel**: `https://wms-formatex.vercel.app` muestra pantalla de login
- [ ] **Login**: `admin` / `admin123` → Dashboard con datos
- [ ] **Navegación**: Pedidos, Inventario, Almacén cargan datos
- [ ] **Zebra PWA**: `https://wms-formatex.vercel.app/zebra/picker` funciona
- [ ] **Refresh**: Refrescar en `/pedidos` no da 404

---

## 📝 Referencia Rápida de URLs

| Servicio | URL | Notas |
|----------|-----|-------|
| **Frontend (Vercel)** | `https://wms-formatex.vercel.app` | React SPA |
| **Backend (Render)** | `https://wms-formatex-api.onrender.com` | NestJS API |
| **Swagger Docs** | `https://wms-formatex-api.onrender.com/api/docs` | Documentación interactiva |
| **Database (Supabase)** | `https://supabase.com/dashboard/project/uscdzhxyvbeimnshsyhk` | Panel de administración |

---

## ⚠️ Notas Importantes

### Cold Starts en Render (Free Tier)

El plan **Free** de Render apaga el servicio después de 15 minutos de inactividad. La primera request después de un cold start tarda **~30-60 segundos**.

**Solución:** Usar el plan **Starter ($7/mes)** para mantener el servicio siempre activo.

### Límites de Supabase (Free Tier)

| Recurso | Límite Free |
|---------|-------------|
| Database size | 500 MB |
| API requests | 500K/mes |
| Storage | 1 GB |
| Pausing | Después de 7 días de inactividad |

### Custom Domain (Opcional)

**Vercel:**
1. Settings → Domains → Add `wms.formatex.com.mx`
2. Configurar DNS: CNAME → `cname.vercel-dns.com`

**Render:**
1. Settings → Custom Domains → Add `api.formatex.com.mx`
2. Configurar DNS: CNAME → `wms-formatex-api.onrender.com`

### Actualizar VITE_API_URL con Custom Domain

Si configuras dominio custom para el backend:
```
VITE_API_URL=https://api.formatex.com.mx/api
```

---

## 🔄 Re-deploy (Actualizaciones Futuras)

Cada vez que hagas push a `main`, ambos servicios se re-deployean automáticamente:

```bash
cd /Users/jonathanpalacios/Downloads/wms-formatex-v2

# Hacer cambios...
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# Render: re-deploy automático (~3-5 min)
# Vercel: re-deploy automático (~1-2 min)
```

### Deploy Manual

- **Render**: Dashboard → Web Service → Manual Deploy → "Deploy latest commit"
- **Vercel**: Dashboard → Project → Deployments → Redeploy
