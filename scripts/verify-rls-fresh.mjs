// Lightweight RLS sanity check for a freshly-created production DB with no
// real data yet. Confirms:
//   1. The qs_worker role can authenticate through the pooler.
//   2. Without `app.user_id` set, the worker connection sees zero rows on every
//      RLS-protected table -- the policies are active and fail closed.
//   3. The owner connection still sees the seeded admin user, proving the
//      ALTER TABLE ... ENABLE ROW LEVEL SECURITY (without FORCE) lets the
//      owner bypass policies as designed.
import pg from "pg";

const ownerUrl = process.env.DATABASE_URL;
const workerUrl = process.env.DATABASE_URL_WORKER;
if (!ownerUrl || !workerUrl) {
  console.error("DATABASE_URL and DATABASE_URL_WORKER must both be set.");
  process.exit(1);
}

const tables = [
  "User",
  "Project",
  "Section",
  "Table",
  "ProjectWorker",
  "ActivityLog",
  "Accommodation",
  "AccommodationWorker",
];

const owner = new pg.Client({ connectionString: ownerUrl });
const worker = new pg.Client({ connectionString: workerUrl });
let ok = true;
try {
  await owner.connect();
  const adminCount = await owner.query('SELECT count(*)::int AS n FROM "User"');
  if (adminCount.rows[0].n < 1) {
    console.error(`FAIL: owner sees ${adminCount.rows[0].n} User rows -- expected at least 1 (seeded admin).`);
    ok = false;
  } else {
    console.log(`PASS: owner sees ${adminCount.rows[0].n} User row(s) (admin seeded).`);
  }

  await worker.connect();
  for (const t of tables) {
    const r = await worker.query(`SELECT count(*)::int AS n FROM "${t}"`);
    if (r.rows[0].n !== 0) {
      console.error(`FAIL: worker (no context) saw ${r.rows[0].n} rows in "${t}".`);
      ok = false;
    }
  }
  if (ok) {
    console.log(`PASS: qs_worker authenticated via pooler and sees 0 rows on all ${tables.length} RLS tables without app.user_id set.`);
  }
} catch (e) {
  console.error("ERROR:", e.message);
  ok = false;
} finally {
  await owner.end().catch(() => {});
  await worker.end().catch(() => {});
}

process.exit(ok ? 0 : 1);
