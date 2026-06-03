import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PROJECT_FILES_BUCKET = process.env.SUPABASE_PROJECT_FILES_BUCKET ?? "project-files";

let cached: ReturnType<typeof createClient> | null = null;
function client() {
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage operations");
  }
  if (!cached) {
    cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return cached;
}

export async function uploadProjectFile(key: string, body: ArrayBuffer | Buffer, contentType: string): Promise<void> {
  const { error } = await client().storage.from(PROJECT_FILES_BUCKET).upload(key, body, { contentType, upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

export async function createSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await client().storage.from(PROJECT_FILES_BUCKET).createSignedUrl(key, expiresInSeconds);
  if (error || !data) throw new Error(`storage signing failed: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

export async function deleteProjectFile(key: string): Promise<void> {
  const { error } = await client().storage.from(PROJECT_FILES_BUCKET).remove([key]);
  if (error) throw new Error(`storage delete failed: ${error.message}`);
}
