-- Add username as nullable, backfill from email local-part, then enforce NOT NULL + UNIQUE.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = LOWER(SPLIT_PART("email", '@', 1)) WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Email becomes optional. Keep the unique index but allow NULL.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- New flag for forced password change on first login.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- Existing admin already changed from the seed default; don't lock them out.
UPDATE "User" SET "mustChangePassword" = false WHERE "role" = 'ADMIN';
