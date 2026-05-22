-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sk';

-- Backfill the new URL-locale preference from the existing account language
-- (EN -> en, SK -> sk) so current users keep their effective language.
UPDATE "User" SET "locale" = lower("language"::text);
