/**
 * Phase 14 — Production Deployment & Hosting Setup Verification Suite
 * Tests all production configurations, CORS policies, dynamic QR domain resolution,
 * health endpoints, reverse proxy trust, build artifacts, and migration setups.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

const PROJECT_ROOT = process.cwd();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 PHASE 14 — PRODUCTION DEPLOYMENT & HOSTING VERIFICATION');
  console.log('================================================================\n');

  // TEST 1: Neon Database Configuration & Migration Files
  console.log('📋 Test Group 1: Neon PostgreSQL Database & Prisma Migrations');
  const schemaPath = path.join(PROJECT_ROOT, 'backend/prisma/schema.prisma');
  assert(fs.existsSync(schemaPath), 'schema.prisma exists');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  assert(schemaContent.includes('provider = "postgresql"'), 'Prisma datasource uses postgresql');
  assert(schemaContent.includes('@@index([shortCode])'), 'ShortCode index exists for fast dynamic lookup');
  assert(schemaContent.includes('@@index([qrCodeId, scannedAt])'), 'Scan tracking composite index exists');

  const migrationDir = path.join(PROJECT_ROOT, 'backend/prisma/migrations/20241001000000_init');
  assert(fs.existsSync(migrationDir), 'Baseline migration directory exists');
  const migrationFile = path.join(migrationDir, 'migration.sql');
  assert(fs.existsSync(migrationFile), 'Baseline migration.sql exists');
  const migrationSql = fs.readFileSync(migrationFile, 'utf8');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS "qr_codes"'), 'migration.sql is idempotent (IF NOT EXISTS)');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS "qr_scans"'), 'migration.sql creates qr_scans table');

  // TEST 2: Backend Production Hosting Configurations (Render & Railway)
  console.log('\n📋 Test Group 2: Backend PaaS Configurations (Render & Railway)');
  const renderYamlPath = path.join(PROJECT_ROOT, 'backend/render.yaml');
  assert(fs.existsSync(renderYamlPath), 'backend/render.yaml exists');
  const renderContent = fs.readFileSync(renderYamlPath, 'utf8');
  assert(renderContent.includes('healthCheckPath: /api/health'), 'Render config monitors /api/health');
  assert(renderContent.includes('prisma migrate deploy'), 'Render build command includes safe prisma migrate deploy');
  assert(renderContent.includes('APP_BASE_URL'), 'Render config includes APP_BASE_URL env var');

  const procfilePath = path.join(PROJECT_ROOT, 'backend/Procfile');
  assert(fs.existsSync(procfilePath), 'backend/Procfile exists for Railway/Heroku');

  const railwayJsonPath = path.join(PROJECT_ROOT, 'backend/railway.json');
  assert(fs.existsSync(railwayJsonPath), 'backend/railway.json exists');
  const railwayContent = fs.readFileSync(railwayJsonPath, 'utf8');
  assert(railwayContent.includes('/api/health'), 'Railway config monitors /api/health');
  assert(railwayContent.includes('prisma migrate deploy'), 'Railway config includes prisma migrate deploy');

  // TEST 3: Frontend Production Hosting Configurations (Vercel)
  console.log('\n📋 Test Group 3: Frontend Vercel SPA Configuration');
  const vercelJsonPath = path.join(PROJECT_ROOT, 'frontend/vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'frontend/vercel.json exists');
  const vercelContent = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  assert(Array.isArray(vercelContent.rewrites), 'vercel.json has rewrites array');
  const hasIndexRewrite = vercelContent.rewrites.some(r => r.source === '/(.*)' && r.destination === '/index.html');
  assert(hasIndexRewrite, 'vercel.json rewrites all SPA routes to /index.html');
  assert(Array.isArray(vercelContent.headers), 'vercel.json configures security headers');

  const rootVercelPath = path.join(PROJECT_ROOT, 'vercel.json');
  assert(fs.existsSync(rootVercelPath), 'Root vercel.json exists for monorepo imports');

  // TEST 4: Environment Variable Templates
  console.log('\n📋 Test Group 4: Environment Variables Templates');
  const backendEnvEx = path.join(PROJECT_ROOT, 'backend/.env.example');
  const backendEnvProdEx = path.join(PROJECT_ROOT, 'backend/.env.production.example');
  assert(fs.existsSync(backendEnvEx), 'backend/.env.example exists');
  assert(fs.existsSync(backendEnvProdEx), 'backend/.env.production.example exists');

  const prodEnvContent = fs.readFileSync(backendEnvProdEx, 'utf8');
  assert(prodEnvContent.includes('DATABASE_URL='), 'backend/.env.production.example specifies DATABASE_URL');
  assert(prodEnvContent.includes('APP_BASE_URL='), 'backend/.env.production.example specifies APP_BASE_URL');
  assert(prodEnvContent.includes('DYNAMIC_QR_BASE_URL='), 'backend/.env.production.example specifies DYNAMIC_QR_BASE_URL');
  assert(prodEnvContent.includes('FRONTEND_URL='), 'backend/.env.production.example specifies FRONTEND_URL');
  assert(prodEnvContent.includes('CORS_ORIGIN='), 'backend/.env.production.example specifies CORS_ORIGIN');
  assert(prodEnvContent.includes('TRUST_PROXY=1'), 'backend/.env.production.example specifies TRUST_PROXY=1');

  const frontendEnvEx = path.join(PROJECT_ROOT, 'frontend/.env.example');
  const frontendEnvProdEx = path.join(PROJECT_ROOT, 'frontend/.env.production.example');
  assert(fs.existsSync(frontendEnvEx), 'frontend/.env.example exists');
  assert(fs.existsSync(frontendEnvProdEx), 'frontend/.env.production.example exists');
  const feProdContent = fs.readFileSync(frontendEnvProdEx, 'utf8');
  assert(feProdContent.includes('VITE_API_URL='), 'frontend/.env.production.example specifies VITE_API_URL');
  assert(!feProdContent.includes('JWT_SECRET'), 'frontend/.env.production.example does NOT expose JWT_SECRET');
  assert(!feProdContent.includes('DATABASE_URL'), 'frontend/.env.production.example does NOT expose DATABASE_URL');

  // TEST 5: Documentation Files
  console.log('\n📋 Test Group 5: Production Deployment Documentation');
  const deploymentMdPath = path.join(PROJECT_ROOT, 'DEPLOYMENT.md');
  assert(fs.existsSync(deploymentMdPath), 'DEPLOYMENT.md exists');
  const depMd = fs.readFileSync(deploymentMdPath, 'utf8');
  assert(depMd.includes('Neon PostgreSQL Database Setup'), 'DEPLOYMENT.md covers Neon setup');
  assert(depMd.includes('Render Deployment'), 'DEPLOYMENT.md covers Render deployment');
  assert(depMd.includes('Railway Deployment'), 'DEPLOYMENT.md covers Railway deployment');
  assert(depMd.includes('Frontend Deployment (Vercel)'), 'DEPLOYMENT.md covers Vercel setup');
  assert(depMd.includes('Dynamic QR Shortlinks Configuration'), 'DEPLOYMENT.md covers Dynamic QR setup');
  assert(depMd.includes('Custom Domain & DNS Setup'), 'DEPLOYMENT.md covers Custom Domains');
  assert(depMd.includes('Post-Deployment Verification Checklist'), 'DEPLOYMENT.md includes full 15-point checklist');

  // TEST 6: Running Backend Verification (Health & Dynamic QR Endpoint)
  console.log('\n📋 Test Group 6: Live Backend Verification (Health Endpoint & Dynamic Engine)');
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    assert(healthRes.status === 200, 'GET /api/health responds with 200 OK');
    const healthJson = await healthRes.json();
    assert(healthJson.success === true, 'Health response indicates success: true');
    assert(healthJson.data?.status === 'healthy', 'Health status is "healthy"');
    assert(healthJson.data?.database?.connected === true, 'Neon database is connected');
    assert(typeof healthJson.data?.database?.latencyMs === 'number', `Neon DB latency is reported (${healthJson.data?.database?.latencyMs}ms)`);
    assert(!JSON.stringify(healthJson).includes('password'), 'Health response does NOT leak DB password');
    assert(!JSON.stringify(healthJson).includes('JWT_SECRET'), 'Health response does NOT leak JWT_SECRET');

    // Dynamic QR info endpoint check
    const nonExistentCode = 'NonExistentXYZ999';
    const dynamicRes = await fetch(`http://localhost:5000/q/${nonExistentCode}`);
    assert(dynamicRes.status === 404, 'Non-existent dynamic shortlink responds with 404 HTML');
    const dynamicHtml = await dynamicRes.text();
    assert(dynamicHtml.includes('QR Code Not Found'), 'Dynamic 404 returns styled fallback UI');
  } catch (err) {
    console.error('  ❌ Error connecting to live backend on port 5000:', err.message);
    failed++;
  }

  // TEST 7: Production Build Artifacts Verification
  console.log('\n📋 Test Group 7: Production Build Verification');
  const backendDistServer = path.join(PROJECT_ROOT, 'backend/dist/server.js');
  assert(fs.existsSync(backendDistServer), 'backend/dist/server.js compiled successfully');

  const frontendDistHtml = path.join(PROJECT_ROOT, 'frontend/dist/index.html');
  assert(fs.existsSync(frontendDistHtml), 'frontend/dist/index.html built successfully');
  const frontendAssets = fs.readdirSync(path.join(PROJECT_ROOT, 'frontend/dist/assets'));
  assert(frontendAssets.some(f => f.startsWith('vendor-react-')), 'React vendor chunk generated');
  assert(frontendAssets.some(f => f.startsWith('vendor-charts-')), 'Charts vendor chunk generated');

  console.log('\n================================================================');
  console.log(`🏁 Phase 14 Deployment Verification Finished`);
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
