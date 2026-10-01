-- CreateEnum
CREATE TYPE "QrType" AS ENUM ('URL', 'TEXT', 'WIFI', 'PAYMENT');

-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "branding" JSONB,
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qr_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "QrType" NOT NULL,
    "content" TEXT NOT NULL,
    "is_dynamic" BOOLEAN NOT NULL DEFAULT false,
    "status" "QrStatus" NOT NULL DEFAULT 'ACTIVE',
    "scan_count" INTEGER NOT NULL DEFAULT 0,
    "short_code" TEXT,
    "destination_url" TEXT,
    "last_scanned_at" TIMESTAMP(3),
    "metadata" JSONB,
    "design" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qr_scans" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_type" TEXT NOT NULL DEFAULT 'unknown',
    "browser" TEXT NOT NULL DEFAULT 'Unknown',
    "operating_system" TEXT NOT NULL DEFAULT 'Unknown',
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "city" TEXT DEFAULT 'Unknown',
    "referrer" TEXT DEFAULT 'Direct / Camera',
    "visitor_id" TEXT NOT NULL,

    CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_reset_password_token_idx" ON "users"("reset_password_token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_short_code_key" ON "qr_codes"("short_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_codes_user_id_idx" ON "qr_codes"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_codes_user_id_status_idx" ON "qr_codes"("user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_codes_user_id_created_at_idx" ON "qr_codes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_codes_short_code_idx" ON "qr_codes"("short_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_idx" ON "qr_scans"("qr_code_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_scanned_at_idx" ON "qr_scans"("qr_code_id", "scanned_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_scans_scanned_at_idx" ON "qr_scans"("scanned_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_device_type_idx" ON "qr_scans"("qr_code_id", "device_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_browser_idx" ON "qr_scans"("qr_code_id", "browser");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_operating_system_idx" ON "qr_scans"("qr_code_id", "operating_system");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_codes_user_id_fkey'
  ) THEN
    ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_scans_qr_code_id_fkey'
  ) THEN
    ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
