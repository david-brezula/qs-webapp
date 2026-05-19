// Verifies the worker wage RLS policies isolate one worker's data.
// Run after scripts/setup-rls-role.sql, with seed data present:
//   node --env-file=.env.local scripts/verify-rls.mjs
import pg from "pg";

const ownerUrl = process.env.DATABASE_URL;
const workerUrl = process.env.DATABASE_URL_WORKER;
if (!ownerUrl || !workerUrl) {
  console.error("DATABASE_URL and DATABASE_URL_WORKER must both be set.");
  process.exit(1);
}

// As the owner, pick the worker with the most ProjectWorker rows.
const owner = new pg.Client({ connectionString: ownerUrl });
await owner.connect();
const sample = await owner.query(
  `SELECT "userId", count(*)::int AS pw_rows
   FROM "ProjectWorker"
   GROUP BY "userId"
   ORDER BY pw_rows DESC
   LIMIT 1`,
);
await owner.end();

if (sample.rows.length === 0) {
  console.error("No ProjectWorker rows exist -- seed data first.");
  process.exit(1);
}
const { userId, pw_rows: expected } = sample.rows[0];

// As qs_worker, query with and without the RLS context set.
const worker = new pg.Client({ connectionString: workerUrl });
await worker.connect();

await worker.query("BEGIN");
await worker.query("SELECT set_config('app.user_id', $1, true)", [userId]);
const scoped = await worker.query('SELECT count(*)::int AS n FROM "ProjectWorker"');
const foreign = await worker.query(
  'SELECT count(*)::int AS n FROM "ProjectWorker" WHERE "userId" <> $1',
  [userId],
);
await worker.query("COMMIT");

const noContext = await worker.query('SELECT count(*)::int AS n FROM "ProjectWorker"');
await worker.end();

let ok = true;
if (scoped.rows[0].n !== expected) {
  console.error(`FAIL: scoped query saw ${scoped.rows[0].n} rows, expected ${expected}.`);
  ok = false;
}
if (foreign.rows[0].n !== 0) {
  console.error(`FAIL: worker saw ${foreign.rows[0].n} other workers' rows.`);
  ok = false;
}
if (noContext.rows[0].n !== 0) {
  console.error(`FAIL: with no context set, worker saw ${noContext.rows[0].n} rows.`);
  ok = false;
}

if (ok) {
  console.log(`PASS: RLS isolates worker ${userId} -- ${expected} own rows, 0 leaked, 0 without context.`);
  process.exit(0);
}
process.exit(1);
