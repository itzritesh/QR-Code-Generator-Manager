# Production Deployment & Hosting Guide

Comprehensive production setup and hosting guide for the **QR Code Generator & Management Platform**.

---

## 1. Production Architecture Overview

The recommended and battle-tested production architecture consists of three decoupled, highly scalable tiers:

```
                  ┌─────────────────────────────────────────┐
                  │            Public Internet              │
                  └──────┬───────────────────────────┬──────┘
                         │                           │
         HTTPS / Web     │                           │  HTTPS / Camera Scan
   https://yourdomain.com│                           │  https://api.yourdomain.com/q/:code
                         ▼                           ▼
            ┌─────────────────────────┐ ┌─────────────────────────┐
            │     Frontend (SPA)      │ │      Backend (API)      │
            │         Vercel          │ │    Render or Railway    │
            │  React + Vite + Tailwind│ │  Node + Express + TS    │
            └────────────┬────────────┘ └────────────┬────────────┘
                         │ API Requests              │
                         │ (Bearer JWT)              │
                         └───────────────┬───────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │    Database (Serverless)│
                            │     Neon PostgreSQL     │
                            │  Pooled PgBouncer (SSL) │
                            └─────────────────────────┘
```

| Component | Platform | Configuration Files | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | `frontend/vercel.json`, `vercel.json` | Blazing fast global Edge CDN, SPA routing, zero server maintenance. |
| **Backend** | [Render](https://render.com) or [Railway](https://railway.app) | `backend/render.yaml`, `backend/railway.json`, `backend/Procfile` | Auto-scaling Node.js container with health checks, rate limiting, and reverse proxy trust. |
| **Database** | [Neon](https://neon.tech) | `backend/prisma/schema.prisma`, `backend/prisma/migrations/` | Serverless PostgreSQL with auto-scaling, pgBouncer connection pooling, and SSL encryption. |

---

## 2. Neon PostgreSQL Database Setup

[Neon](https://neon.tech) provides serverless PostgreSQL with built-in pgBouncer connection pooling.

### 2.1 Create Neon Project
1. Log in to your [Neon Console](https://console.neon.tech).
2. Click **New Project**:
   - **Name**: `qr-code-platform`
   - **Postgres version**: `16` (or latest recommended)
   - **Region**: Choose the region closest to your backend hosting (e.g., `AWS us-east-2 (Ohio)` for Render Ohio).
3. Once created, navigate to **Dashboard** -> **Connection Details**.

### 2.2 Select Connection String
Ensure you toggle **"Pooled connection"** (adds `-pooler` to the host name).
```
postgresql://[user]:[password]@ep-xxxx-pooler.[region].aws.neon.tech/neondb?sslmode=require
```
> [!IMPORTANT]
> Always use the **Pooled connection** string for `DATABASE_URL`. PaaS platforms (Render, Railway, Vercel) create multiple container processes; Neon's PgBouncer pooler prevents exhausting PostgreSQL max connection limits.

### 2.3 Run Production Database Migrations
The repository includes version-controlled baseline migrations under `backend/prisma/migrations/20241001000000_init/`.

To apply migrations safely to your Neon database without wiping any data:
```bash
# In the backend directory (or via Render/Railway build command)
npx prisma migrate deploy
```

To verify the migration status:
```bash
npx prisma migrate status
```

Output should show:
```
Database schema is up to date!
```

---

## 3. Backend Deployment

### Option A: Render Deployment (Recommended)

1. **Push your code to GitHub or GitLab**.
2. **Log in to [Render](https://dashboard.render.com)**.
3. Click **New +** -> **Blueprint**, and connect your repository. Render will automatically detect `backend/render.yaml`.
   *Or create a **Web Service** manually with the following settings:*
   - **Name**: `qr-code-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Region**: Same as Neon DB (e.g. `Ohio`)
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npm run build && npx prisma migrate deploy
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Health Check Path**:
     ```
     /api/health
     ```

4. **Add Backend Environment Variables in Render**:
   | Variable | Value / Description | Example |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | `production` |
   | `PORT` | `10000` (Render default) | `10000` |
   | `DATABASE_URL` | Neon pooled connection string | `postgresql://...-pooler...` |
   | `JWT_SECRET` | 64-character random string (`openssl rand -hex 32`) | `e9f8c...` |
   | `JWT_EXPIRES_IN` | `7d` | `7d` |
   | `APP_BASE_URL` | Public HTTPS URL of this backend | `https://qr-backend.onrender.com` |
   | `DYNAMIC_QR_BASE_URL` | Domain where dynamic QR shortlinks resolve | `https://qr-backend.onrender.com` |
   | `FRONTEND_URL` | Public HTTPS URL of the frontend | `https://qr-platform.vercel.app` |
   | `CORS_ORIGIN` | Allowed origins (comma-separated) | `https://qr-platform.vercel.app` |
   | `TRUST_PROXY` | `1` | `1` |
   | `RATE_LIMIT_MAX` | `300` | `300` |

5. Click **Create Web Service**. Render will build the TypeScript project, run `prisma migrate deploy`, and start `node dist/server.js`.

---

### Option B: Railway Deployment

1. **Log in to [Railway](https://railway.app)**.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository and configure service:
   - **Root Directory**: `backend`
   - Railway will detect `backend/railway.json` and `backend/Procfile`.
   - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm run start`
   - **Healthcheck Path**: `/api/health`
4. In the **Variables** tab, add all environment variables listed in the table above.
5. In **Settings** -> **Networking**, click **Generate Domain** to get your public URL (e.g., `https://qr-backend.up.railway.app`).

---

## 4. Frontend Deployment (Vercel)

1. **Log in to [Vercel](https://vercel.com)**.
2. Click **Add New...** -> **Project**, and import your Git repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend` (or leave as root if using root `vercel.json`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Add Frontend Environment Variables in Vercel**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://qr-backend.onrender.com` | The public HTTPS backend URL (or `https://api.yourdomain.com`). |
   | `VITE_APP_TITLE` | `QR Code Generator & Management Platform` | Browser document title. |

> [!CAUTION]
> Never put `DATABASE_URL` or `JWT_SECRET` in Vercel environment variables. Vite environment variables prefixed with `VITE_` are bundled into client-side JavaScript. Only public variables should be prefixed with `VITE_`.

5. Click **Deploy**. Vercel will build the frontend and serve it globally with SPA routing rewrites configured via `vercel.json`.

---

## 5. Dynamic QR Shortlinks Configuration

Dynamic QR codes embed shortlink URLs pointing to your backend redirection engine.

### How Dynamic Scanning Works:
```
1. Physical Print / Screen
   └─ QR Matrix encodes: https://api.yourdomain.com/q/aBc9X1z
2. Mobile Smartphone Camera Scans QR
   └─ Phone browser sends GET request to https://api.yourdomain.com/q/aBc9X1z
3. Backend Server:
   ├─ Detects device, OS, browser, country, visitor hash
   ├─ Saves scan analytics record to Neon PostgreSQL
   ├─ Increments scanCount on QR code record
   └─ Responds with HTTP 302 Found -> Destination URL (e.g. https://mybrand.com/promo)
4. Smartphone opens target page seamlessly (< 150ms)
```

### Critical Environment Variable:
Make sure `DYNAMIC_QR_BASE_URL` (or `APP_BASE_URL`) on your backend is set to the **real public domain**:
```env
# Production backend env:
APP_BASE_URL=https://api.yourdomain.com
DYNAMIC_QR_BASE_URL=https://api.yourdomain.com
```
*Do NOT use `http://localhost:5000` or `http://localhost:5173` in production.*

---

## 6. Custom Domain & DNS Setup

To use a custom domain (e.g. `yourdomain.com`):

### 6.1 Recommended Domain Topology
- **Frontend**: `yourdomain.com` or `app.yourdomain.com`
- **Backend & Shortlinks**: `api.yourdomain.com` (or `qr.yourdomain.com`)

### 6.2 DNS Configuration (Cloudflare / Namecheap / GoDaddy / Route 53)

| Type | Name / Host | Value / Target | Notes |
| :--- | :--- | :--- | :--- |
| **CNAME** | `@` or `app` | `cname.vercel-dns.com` | Points frontend domain to Vercel CDN |
| **CNAME** | `api` | `qr-backend.onrender.com` | Points API & Dynamic QR domain to Render/Railway |
| **TXT** | `@` | (Verification token from Vercel) | Required for domain ownership verification |

### 6.3 Update Environment Variables with Custom Domain
Once DNS propagates and SSL certificates are active:

1. **In Render / Railway (Backend)**:
   - `APP_BASE_URL` = `https://api.yourdomain.com`
   - `DYNAMIC_QR_BASE_URL` = `https://api.yourdomain.com`
   - `FRONTEND_URL` = `https://yourdomain.com`
   - `CORS_ORIGIN` = `https://yourdomain.com,https://app.yourdomain.com`
2. **In Vercel (Frontend)**:
   - `VITE_API_URL` = `https://api.yourdomain.com`
   - Redeploy the frontend so the new `VITE_API_URL` is baked into the build.

---

## 7. Complete Environment Variables Matrix

### Backend Variables (`backend/.env`)

| Variable | Required | Default (Dev) | Production Value Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `development` | `production` | Enables strict security, HSTS, production logging |
| `PORT` | Yes | `5000` | `10000` | Port listened by Express (auto-injected by PaaS) |
| `DATABASE_URL` | Yes | - | `postgresql://...@...-pooler...` | Neon PostgreSQL pooled connection string |
| `JWT_SECRET` | Yes | - | `openssl rand -hex 32` | Cryptographic secret for signing auth tokens |
| `JWT_EXPIRES_IN`| No | `7d` | `7d` | JWT session lifetime |
| `APP_BASE_URL` | Yes | `http://localhost:5000` | `https://api.yourdomain.com` | Public base URL of the backend service |
| `DYNAMIC_QR_BASE_URL` | No | Falls back to `APP_BASE_URL` | `https://api.yourdomain.com` | Public base domain embedded in dynamic QR codes |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | `https://yourdomain.com` | Public URL of the frontend web application |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | `https://yourdomain.com` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | `900000` | Window in milliseconds (15 mins) |
| `RATE_LIMIT_MAX` | No | `300` | `300` | Max requests per IP per window |
| `TRUST_PROXY` | No | `1` | `1` | Express reverse proxy trust for client IP detection |

### Frontend Variables (`frontend/.env`)

| Variable | Required | Default (Dev) | Production Value Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Yes | `http://localhost:5000` | `https://api.yourdomain.com` | Base URL used by Axios client |
| `VITE_APP_TITLE` | No | App Title | `QR Code Generator & Management Platform` | Document title |

---

## 8. Post-Deployment Verification Checklist

Execute this verification sequence against the deployed production URLs:

- [ ] **1. Health Endpoint**: Visit `https://api.yourdomain.com/api/health`. Verify HTTP 200 with status `"healthy"`, `database.connected: true`, and Neon latency reported.
- [ ] **2. Landing Page**: Visit `https://yourdomain.com`. Verify hero section, features, CTA buttons, and header render cleanly with responsive layout.
- [ ] **3. User Registration**: Register a new user account with email and password. Verify password requirements and JWT token issuance.
- [ ] **4. User Login & Logout**: Log out, then log back in with registered credentials. Verify persistent auth header.
- [ ] **5. Dashboard Access**: Verify dashboard loads recent metrics, quick action buttons, and empty/populated state.
- [ ] **6. Static QR Code Generation**: Generate a Static URL QR code. Verify live canvas preview, SVG render, and color customizer.
- [ ] **7. Dynamic QR Code Generation**: Generate a Dynamic QR code pointing to `https://google.com`. Verify the generated link is `https://api.yourdomain.com/q/<shortCode>` (NOT localhost).
- [ ] **8. Real Scan Redirection**:
  - Scan the dynamic QR code with a physical smartphone camera.
  - Verify instant HTTP 302 redirection to the destination URL.
- [ ] **9. Real Scan Analytics Tracking**:
  - Return to the dashboard and open the QR Code Analytics page.
  - Verify the scan was recorded with device type (Mobile), operating system (iOS/Android), browser, and scan count incremented.
- [ ] **10. Status Toggle (Active / Disabled)**:
  - Edit the dynamic QR code and change its status to **Disabled**.
  - Scan again with smartphone or visit `https://api.yourdomain.com/q/<shortCode>`.
  - Verify the styled "QR Code Inactive" page renders.
  - Re-enable the QR code and verify traffic resumes.
- [ ] **11. QR Code Editing**: Update the destination URL of the dynamic QR code to a new URL. Verify already printed/scanned code redirects to the new destination.
- [ ] **12. Multi-Format Downloads**: Test downloading the QR code as PNG, SVG, and print-ready PDF.
- [ ] **13. Custom Logo Upload**: Upload a PNG logo to the QR code center. Verify error correction automatically upgrades to high (H) for scannability.
- [ ] **14. Bulk QR Generation**: Upload a CSV file on the Bulk Generation page and download the resulting ZIP archive of QR codes.
- [ ] **15. Mobile Responsiveness**: Open the management dashboard on mobile device / viewport. Verify navigation drawer, table horizontal scrolling, and touch-friendly controls.
