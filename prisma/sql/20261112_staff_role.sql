-- STAFF: an assistant login with limited admin access (see functions/_lib/auth.js `staffOk` and routes/admin*.js).
-- Run as two separate statements (ALTER TYPE ... ADD VALUE cannot share a transaction with code that uses the value).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';
-- Set on accounts created with a temporary password: until they choose their own, the API only allows
-- /api/auth/me and the password-change endpoint.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
