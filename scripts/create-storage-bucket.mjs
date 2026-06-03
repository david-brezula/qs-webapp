// One-time setup: create the private Supabase Storage bucket for client-portal
// project photos/documents. Idempotent. Uses the service-role key (full storage
// admin, bypasses RLS). Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY /
// SUPABASE_PROJECT_FILES_BUCKET from .env.local (or the process env).
//
//   node scripts/create-storage-bucket.mjs
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", override: false });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_PROJECT_FILES_BUCKET ?? "project-files";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb.storage.createBucket(bucket, { public: false });

if (error) {
  const msg = String(error.message ?? error).toLowerCase();
  if (msg.includes("exist")) {
    console.log(`Bucket "${bucket}" already exists — ok.`);
    process.exit(0);
  }
  console.error("Bucket creation failed:", error);
  process.exit(1);
}
console.log(`Bucket created:`, data);
