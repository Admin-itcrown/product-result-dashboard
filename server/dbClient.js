import sql from 'mssql';

// Load DB profiles from environment. Example:
// DB_PROFILES=sorting,glaze,kiln
// DB_SORTING_NAME=Db_Sorting
// DB_GLAZE_NAME=Db_glaze
// Per-profile overrides (optional): DB_SORTING_SERVER, DB_SORTING_PORT, DB_SORTING_USER, DB_SORTING_PASS

const rawProfiles = process.env.DB_PROFILES || '';
const profileKeys = rawProfiles ? rawProfiles.split(',').map(s => s.trim()).filter(Boolean) : [];

function readProfileConfig(key) {
  const up = String(key).toUpperCase();
  const cfg = {
    user: process.env[`DB_${up}_USER`] || process.env.DB_USER || 'sa',
    password: process.env[`DB_${up}_PASS`] || process.env.DB_PASS || '',
    server: process.env[`DB_${up}_SERVER`] || process.env.DB_SERVER || '192.168.2.19',
    port: process.env[`DB_${up}_PORT`] ? parseInt(process.env[`DB_${up}_PORT`], 10) : (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined),
    database: process.env[`DB_${up}_NAME`] || process.env.DB_NAME || key,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: process.env[`DB_${up}_CONN_TIMEOUT`] ? parseInt(process.env[`DB_${up}_CONN_TIMEOUT`], 10) : (process.env.DB_CONN_TIMEOUT ? parseInt(process.env.DB_CONN_TIMEOUT, 10) : 30000),
    requestTimeout: process.env[`DB_${up}_REQ_TIMEOUT`] ? parseInt(process.env[`DB_${up}_REQ_TIMEOUT`], 10) : (process.env.DB_REQ_TIMEOUT ? parseInt(process.env.DB_REQ_TIMEOUT, 10) : 90000),
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
  return cfg;
}

// Profiles map: key -> config
const profiles = {};
if (profileKeys.length > 0) {
  for (const k of profileKeys) profiles[k] = readProfileConfig(k);
} else {
  // fallback single default profile named 'default'
  profiles['default'] = readProfileConfig('default');
}

export const allowedProfiles = Object.keys(profiles);
export const defaultProfile = allowedProfiles[0];

// expose profiles map for diagnostics
export { profiles };

// Debug: show resolved profile -> database/server/port mapping on startup
try {
  const dbg = Object.fromEntries(Object.entries(profiles).map(([k, p]) => [k, { database: p.database, server: p.server, port: p.port }]));
  console.log('DB profiles resolved:', JSON.stringify(dbg));
} catch (e) {
  // ignore
}

// pool cache keyed by server:port/database
const pools = new Map();

function poolKey(cfg) {
  const host = cfg.server || '';
  const port = cfg.port || '';
  const db = cfg.database || '';
  return `${host}:${port}/${db}`;
}

// helper to expose pool key for a profile
export function getPoolKeyForProfile(profile) {
  const p = profiles[profile];
  if (!p) return null;
  return poolKey(p);
}

export async function getPoolForProfile(profile) {
  const p = profiles[profile];
  if (!p) throw new Error(`Unknown DB profile: ${profile}`);
  const key = poolKey(p);
  const existing = pools.get(key);
  if (existing && existing.connected) return existing;
  try {
    console.log('Connecting to DB', p.server, p.port ? `:${p.port}` : '', 'db=', p.database);
    // IMPORTANT: use dedicated ConnectionPool per config.
    // sql.connect(...) uses a global singleton pool and will ignore multi-db intent.
    const pool = await new sql.ConnectionPool(p).connect();
    pools.set(key, pool);
    return pool;
  } catch (err) {
    console.error('DB connection error:', err && err.message ? err.message : err);
    throw err;
  }
}

export async function closeAllPools() {
  for (const [k, p] of pools.entries()) {
    try { await p.close(); } catch (e) { /* ignore */ }
    pools.delete(k);
  }
}

export default { profiles, allowedProfiles, defaultProfile, getPoolForProfile, closeAllPools };
