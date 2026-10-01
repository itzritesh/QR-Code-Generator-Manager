# QR Code Generator & Management Platform

A production-ready SaaS application for generating, styling, managing, and tracking dynamic QR codes. Built from scratch with a scalable, modern monorepo architecture, light-theme SaaS design, PostgreSQL on Neon via Prisma ORM, Express.js backend, and React + Vite frontend.

---

## 🚀 Technology Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (curated light-theme SaaS aesthetic)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)
- **Networking**: Centralized [Axios](https://axios-http.com/) client with request/response interceptors
- **Analytics Ready**: [Recharts](https://recharts.org/)
- **QR Engine**: [qrcode](https://www.npmjs.com/package/qrcode)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: TypeScript
- **Security & Headers**: [Helmet](https://helmetjs.github.io/), [CORS](https://www.npmjs.com/package/cors)
- **Rate Limiting**: [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
- **Logging**: [Morgan](https://www.npmjs.com/package/morgan)
- **Validation**: Strict schema validation with [Zod](https://zod.dev/)

### Database & ORM
- **Database**: Cloud PostgreSQL on [Neon](https://neon.tech/) (Serverless connection pooler)
- **Schema Isolation**: Dedicated PostgreSQL schema (`qr_platform`)
- **ORM**: [Prisma ORM](https://www.prisma.io/)

---

## 📁 Project Structure

```
QR Code Generator & Manager/
├── README.md                          # Comprehensive project documentation
├── .gitignore                         # Git exclusion rules for node_modules, dist, .env
├── package.json                       # Root convenience scripts for monorepo tasks
├── frontend/                          # Client-side React + Vite application
│   ├── index.html                     # HTML5 entry with SEO tags and Inter font
│   ├── vite.config.ts                 # Vite bundler config with path aliases & API proxy
│   ├── tsconfig.json                  # TypeScript compiler options for frontend
│   ├── tailwind.config.js             # Tailwind CSS tokens, colors, and shadows
│   ├── postcss.config.js              # PostCSS plugins (Tailwind, Autoprefixer)
│   ├── .env.example                   # Client environment variable template
│   ├── .env                           # Local client environment config
│   └── src/
│       ├── main.tsx                   # React DOM mount point
│       ├── App.tsx                    # Root provider wrapper & router outlet
│       ├── index.css                  # Global Tailwind base, components, utilities
│       ├── assets/                    # Static images, icons, and brand graphics
│       ├── components/                # Reusable UI components
│       │   └── common/                # Navbar, Footer, Button, Card, Badge
│       ├── layouts/                   # Application layouts (MainLayout)
│       ├── pages/                     # Routed views (HomePage, StatusPage, NotFoundPage)
│       ├── routes/                    # React Router configuration (AppRoutes)
│       ├── hooks/                     # Custom hooks (useHealthCheck)
│       ├── services/                  # Centralized Axios API client (apiClient, healthApi)
│       ├── utils/                     # Utility helpers (cn class merger)
│       └── contexts/                  # Global application context (AppContext)
└── backend/                           # Server-side Express.js API
    ├── package.json                   # Backend dependencies and scripts
    ├── tsconfig.json                  # TypeScript compiler options for backend
    ├── .env.example                   # Server environment variable template
    ├── .env                           # Local server environment config
    ├── prisma/
    │   └── schema.prisma              # Prisma schema definition (PostgreSQL datasource)
    └── src/
        ├── server.ts                  # Server entry point, DB check, and graceful shutdown
        ├── app.ts                     # Express app setup, security middleware, and routes
        ├── config/
        │   ├── env.ts                 # Zod-validated environment configuration
        │   └── db.ts                  # Prisma client instance & DB latency checker
        ├── controllers/
        │   └── health.controller.ts   # System diagnostics & health check controller
        ├── routes/
        │   ├── index.ts               # Main /api router aggregator
        │   └── health.routes.ts       # Health endpoint route definitions
        ├── middleware/
        │   ├── errorHandler.ts        # Centralized operational and Prisma error handler
        │   ├── notFoundHandler.ts     # 404 JSON response handler
        │   ├── rateLimiter.ts         # IP-based rate limiting middleware
        │   └── requestLogger.ts       # Dev/production request logging with Morgan
        ├── services/
        │   └── health.service.ts      # Health check and system diagnostic business logic
        ├── validators/
        │   └── common.validators.ts   # Reusable Zod request validation middleware
        ├── utils/
        │   ├── apiResponse.ts         # Standardized API response formatters
        │   └── logger.ts              # Structured timestamped console logger
        └── types/
            └── index.ts               # Shared backend TypeScript types
```

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | Required |
| `JWT_SECRET` | Cryptographic key for signing JWT tokens | Required (min 16 chars) |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `CORS_ORIGIN` | Allowed client origin | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting duration window (ms) | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Max allowed requests per IP window | `100` |

### Frontend Configuration (`frontend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Target API URL (leave empty for Vite proxy) | `""` |
| `VITE_APP_NAME` | Display name of the platform | `QR Code Generator & Management Platform` |

---

## 🛠️ Local Setup & Installation

### 1. Prerequisites
- **Node.js**: v18.x or v20+ (tested on v24.12.0)
- **npm**: v9+ (tested on v11.6.2)
- **PostgreSQL Database**: [Neon](https://neon.tech/) account & connection string

### 2. Install Dependencies

You can install all dependencies from the root directory:
```bash
npm run install:all
```

Or install separately in each folder:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Database Configuration & Setup

1. Copy `.env.example` to `.env` in the `backend/` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Insert your Neon PostgreSQL connection string into `backend/.env`. (Make sure to specify `?schema=qr_platform` to isolate platform data):
   ```ini
   DATABASE_URL="postgresql://username:password@ep-sample-pooler.region.aws.neon.tech/neondb?schema=qr_platform&sslmode=require"
   ```
3. Validate and push the Prisma schema to Neon:
   ```bash
   npm run prisma:validate
   npm run prisma:generate
   ```
   To synchronize the database schema:
   ```bash
   cd backend
   node node_modules/prisma/build/index.js db push
   ```

---

## 🏃 Running the Application

### Option A: Running with Monorepo Root Scripts

Open two terminals from the root directory:

**Terminal 1 (Backend API):**
```bash
npm run dev:backend
```
*Backend runs on `http://localhost:5000`*

**Terminal 2 (Frontend Client):**
```bash
npm run dev:frontend
```
*Frontend runs on `http://localhost:5173`*

---

### Option B: Running Individually

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🔍 Health Check & API Verification

The backend exposes a real-time health and diagnostic endpoint:
```http
GET http://localhost:5000/api/health
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Service is healthy and fully operational",
  "data": {
    "status": "healthy",
    "service": "QR Code Generator & Management Platform API",
    "version": "1.0.0",
    "environment": "development",
    "uptimeSeconds": 120,
    "timestamp": "2026-09-30T05:43:14.131Z",
    "database": {
      "connected": true,
      "provider": "PostgreSQL (Neon)",
      "latencyMs": 292
    },
    "system": {
      "nodeVersion": "v24.12.0",
      "memoryUsageMB": {
        "rss": 84,
        "heapTotal": 15,
        "heapUsed": 13
      }
    }
  },
  "meta": {
    "timestamp": "2026-09-30T05:43:14.131Z"
  }
}
```

---

## 🏗️ Production Build & Deployment Commands

To build both client and server for production deployment:

```bash
# Build frontend bundle (outputs to frontend/dist)
npm run build:frontend

# Build backend bundle (outputs to backend/dist)
npm run build:backend

# Deploy Prisma migrations to production database (Neon)
npm run prisma:migrate:deploy
```

---

## 🚀 Production Deployment & Hosting (Phase 14)

The application is fully prepared for real-world cloud deployment:
- **Frontend**: [Vercel](https://vercel.com) (React + Vite SPA with `vercel.json` rewrites and caching)
- **Backend**: [Render](https://render.com) or [Railway](https://railway.app) (Node.js + Express with `render.yaml`, `railway.json`, `Procfile`, reverse proxy trust, strict CORS)
- **Database**: [Neon](https://neon.tech) (Serverless PostgreSQL with connection pooling and idempotent migrations)

👉 **For the complete, step-by-step production hosting manual, refer to [DEPLOYMENT.md](file:///c:/Users/rathv/.gemini/antigravity-ide/scratch/QR%20Code%20Generator%20&%20Manager/DEPLOYMENT.md)**.

