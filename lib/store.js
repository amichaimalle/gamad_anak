// אחסון פשוט מסוג key-value.
// מקומית: קובץ data/db.json.
// ב-Vercel: Upstash Redis (דרך Vercel Marketplace) לפי משתני הסביבה
// KV_REST_API_URL + KV_REST_API_TOKEN  או  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
import fs from 'node:fs/promises';
import path from 'node:path';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = 'gamad:';

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

const DB_FILE = process.env.GAMAD_DB_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'db.json');
let queue = Promise.resolve();

async function readFile() {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function withFile(fn) {
  const run = queue.then(async () => {
    const db = await readFile();
    const { result, changed } = await fn(db);
    if (changed) {
      await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
      await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    }
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function get(key) {
  if (REDIS_URL) {
    const v = await redis(['GET', PREFIX + key]);
    return v == null ? null : JSON.parse(v);
  }
  return withFile((db) => ({ result: db[key] ?? null, changed: false }));
}

export async function set(key, value) {
  if (REDIS_URL) return redis(['SET', PREFIX + key, JSON.stringify(value)]);
  return withFile((db) => {
    db[key] = value;
    return { result: 'OK', changed: true };
  });
}

export async function del(keys) {
  if (keys.length === 0) return;
  if (REDIS_URL) return redis(['DEL', ...keys.map((k) => PREFIX + k)]);
  return withFile((db) => {
    for (const k of keys) delete db[k];
    return { result: 'OK', changed: true };
  });
}
