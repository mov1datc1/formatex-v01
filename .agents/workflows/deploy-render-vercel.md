---
description: How to deploy NestJS backend to Render and React/Vite frontend to Vercel — includes known pitfalls and fixes
---

# Deploy NestJS + React/Vite to Render + Vercel

## ⚠️ KNOWN PITFALLS — READ BEFORE DEPLOYING

### 1. Render: `nest: not found` during build

**Root cause:** Render sets `NODE_ENV=production` automatically. This makes `npm install` skip `devDependencies`, where `@nestjs/cli` lives.

**Fix:** Use `--include=dev` in the build command:
```
npm install --include=dev && npx prisma generate && npm run build
```

Also ensure `package.json` uses `npx`:
```json
"build": "npx nest build"
```

### 2. Render: `Cannot find module 'dist/main'`

**Root cause:** NestJS with `"module": "nodenext"` in `tsconfig.json` compiles to `dist/src/main.js` (preserves folder structure) instead of `dist/main.js`.

**Fix:** Update `start:prod` in `package.json`:
```json
"start:prod": "node dist/src/main"
```

**How to verify:** After `nest build`, check where `main.js` actually lives:
```bash
find dist -name "main.js" -type f
```

### 3. Vercel: Only deploys from `main` branch by default

**Root cause:** Vercel free tier uses `main` as the production branch. You cannot change this without a Pro plan.

**Fix:** Always push to `main` branch for production deploys:
```bash
git checkout main
git merge dev
git push origin main
```

Or create `main` from `dev`:
```bash
git checkout -b main  # from dev branch
git push -u origin main --force
```

### 4. Vercel: 404 on page refresh (SPA routing)

**Root cause:** React Router uses client-side routing. Vercel doesn't know about `/pedidos`, `/inventario`, etc.

**Fix:** Create `vercel.json` in the frontend root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 5. CORS errors between Vercel frontend and Render backend

**Fix:** Add these to NestJS CORS origins in `main.ts`:
```typescript
app.enableCors({
  origin: [
    'http://localhost:5173',
    /\.vercel\.app$/,
    /\.onrender\.com$/,
  ],
  credentials: true,
});
```

---

## Render Web Service Configuration

| Field | Value |
|-------|-------|
| Root Directory | `wms-backend` (or wherever the NestJS app is) |
| Runtime | Node |
| Build Command | `npm install --include=dev && npx prisma generate && npm run build` |
| Start Command | `npm run start:prod` |

### Environment Variables (Render)
- `DATABASE_URL` — PostgreSQL connection string (pooler)
- `DIRECT_URL` — Direct DB connection (for migrations)
- `JWT_SECRET` — JWT signing key
- `PORT` — `3000`
- `NODE_ENV` — `production`

## Vercel Configuration

| Field | Value |
|-------|-------|
| Framework | Vite |
| Root Directory | `wms-frontend` (or wherever the Vite app is) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Environment Variables (Vercel)
- `VITE_API_URL` — Full backend URL including `/api` prefix (e.g., `https://my-api.onrender.com/api`)

---

// turbo-all
## Quick Deploy Steps

1. Ensure `package.json` has correct scripts:
   - `"build": "npx nest build"`
   - `"start:prod": "node dist/src/main"` (check actual path with `find dist -name main.js`)

2. Create `vercel.json` with SPA rewrites

3. Add CORS origins for `.vercel.app` and `.onrender.com`

4. Push to `main` branch

5. Deploy Render first (get the URL), then Vercel (set `VITE_API_URL`)
