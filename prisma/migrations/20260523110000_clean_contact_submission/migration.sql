-- Generic construction enquiry: replace the solar-era ContactSubmission columns
-- with phone/serviceType/message and make company optional.
--
-- ⚠️ DESTRUCTIVE: this DROPS the solar-only columns (projectType, sizeMW,
-- country, startDate, scope) and `notes`. If you want to keep historical solar
-- enquiry data, export/back up the ContactSubmission table BEFORE applying.

ALTER TABLE "ContactSubmission"
  DROP COLUMN "projectType",
  DROP COLUMN "sizeMW",
  DROP COLUMN "country",
  DROP COLUMN "startDate",
  DROP COLUMN "scope",
  DROP COLUMN "notes",
  ADD COLUMN  "phone" TEXT,
  ADD COLUMN  "serviceType" TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN  "message" TEXT NOT NULL DEFAULT '',
  ALTER COLUMN "company" DROP NOT NULL;
