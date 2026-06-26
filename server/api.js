import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultProfile, allowedProfiles, getPoolForProfile, profiles, getPoolKeyForProfile } from './dbClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// body-parser JSON error handler: return JSON error instead of HTML stack
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.warn('JSON parse error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON body', detail: err.message });
  }
  next(err);
});

// Simple request logger to help debugging incoming requests
app.use((req, res, next) => {
  try {
    console.log(`--> HTTP ${req.method} ${req.originalUrl}`);
  } catch (e) { }
  next();
});

// DB connection is centralized in ./dbClient.js (getPool, dbConfig)

function runQueryWithTimeout(request, query, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (typeof request.cancel === 'function') request.cancel();
      } catch (e) {
        // ignore
      }
      const err = new Error('Query timeout');
      err.code = 'ETIMEOUT';
      reject(err);
    }, timeoutMs);

    request.query(query)
      .then((r) => {
        if (timedOut) return; // already rejected
        clearTimeout(timer);
        resolve(r);
      })
      .catch((e) => {
        if (timedOut) return; // already timed out
        clearTimeout(timer);
        reject(e);
      });
  });
}

function resolveProfileWithFallback(requestedProfile, fallbackHeaderSetter) {
  const preferredDefault = allowedProfiles.includes('sorting') ? 'sorting' : defaultProfile;
  let profile = requestedProfile ? String(requestedProfile) : preferredDefault;
  if (!allowedProfiles.includes(profile)) {
    console.warn(`Unknown profile='${profile}', falling back to '${preferredDefault}'`);
    if (typeof fallbackHeaderSetter === 'function') fallbackHeaderSetter('X-DB-Fallback', 'true');
    profile = preferredDefault;
  }
  return profile;
}

function formatSqlDateAsIso(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    // SQL date strings usually start with YYYY-MM-DD.
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  if (value instanceof Date) {
    // Use UTC parts to avoid timezone shift on date-only values.
    const yyyy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(value.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(value);
}

function normalizeCycle(rawCycle) {
  const cycle = String(rawCycle || '').trim().toUpperCase();
  if (!cycle) return '';
  if (cycle === 'P') return 'P1';
  return cycle;
}

async function hasColumn(pool, objectName, columnName) {
  const request = pool.request();
  request.input('objectName', sql.NVarChar, objectName);
  request.input('columnName', sql.NVarChar, columnName);
  const query = `
    SELECT TOP 1 1 AS ok
    FROM sys.columns
    WHERE object_id = OBJECT_ID(@objectName)
      AND name = @columnName
  `;
  const result = await runQueryWithTimeout(request, query, 30000);
  return (result.recordset || []).length > 0;
}

const columnExistenceCache = new Map();

async function hasColumnCached(pool, cacheKey, objectName, columnName) {
  if (columnExistenceCache.has(cacheKey)) {
    return columnExistenceCache.get(cacheKey);
  }
  const exists = await hasColumn(pool, objectName, columnName);
  columnExistenceCache.set(cacheKey, exists);
  return exists;
}

function transformProductionSummary(flatData) {
  const grouped = new Map();

  for (const row of flatData) {
    const mDoc = String(row.m_doc || '');
    const cycle = normalizeCycle(row.m_cp);
    const key = `${mDoc}_${cycle}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        mDoc,
        date: formatSqlDateAsIso(row.m_date),
        job: row.m_job || '',
        itemId: row.m_part || '',
        detail1: row.pt_desc1 || '',
        detail2: row.pt_desc2 || '',
        line: row.m_line || '',
        cycle,
        kiln: row.m_kiln || '',
        unit: row.unit || '',
        userlog: '',
        userlogs: [],
        process: Number(row.qtyp || 0),
        complete: Number(row.qtycomp || 0),
        scrap: Number(row.qtyscrp || 0),
        reject: Number(row.qtyrjct || 0),
        defects: [],
      });
    }

    const entry = grouped.get(key);
    const normalizedUserlog = String(row.userlog || '').trim().toLowerCase();
    if (normalizedUserlog && !entry.userlogs.includes(normalizedUserlog)) {
      entry.userlogs.push(normalizedUserlog);
      entry.userlog = entry.userlogs.join(',');
    }

    const defectQty = Number(row.sub_qty || 0);
    if (defectQty <= 0) continue;

    const defectType = String(row.sub_typ || 'Unknown').toUpperCase().trim() || 'UNKNOWN';
    // Type A is "good", not defect.
    if (defectType.startsWith('A')) continue;

    const totalProcess = Number(row.qtyp || 0);
    const defectPercent = totalProcess > 0 ? `${((defectQty / totalProcess) * 100).toFixed(2)}%` : '0.00%';
    entry.defects.push({
      type: defectType,
      qty: defectQty,
      reason: row.rsn_desc || 'Unspecified / Other',
      pd: defectPercent,
    });
  }

  return Array.from(grouped.values()).map((entry) => {
    const { userlogs, ...rest } = entry;
    return rest;
  });
}


app.get('/api/production-report/summary', async (req, res) => {
  try {
    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const profile = resolveProfileWithFallback(req.query.db, res.setHeader.bind(res));
    console.log(`/api/production-report/summary - profile=${profile} resolvedDB=${profiles[profile]?.database} poolKey=${getPoolKeyForProfile(profile)} range=${startDate}..${endDate}`);

    const pool = await getPoolForProfile(profile);
    const userlogColumnCacheKey = `${profile}:dbo.v_rpt_sort:userlog`;
    const hasUserlogColumn = await hasColumnCached(pool, userlogColumnCacheKey, 'dbo.v_rpt_sort', 'userlog');
    const request = pool.request();
    request.input('start', sql.Date, startDate);
    request.input('end', sql.Date, endDate);

    const userlogSelectSql = hasUserlogColumn
      ? 'userlog'
      : "CAST(NULL AS NVARCHAR(100)) AS userlog";
    const userlogGroupBySql = hasUserlogColumn ? 'userlog,' : '';

    const query = `
      SELECT
        m_doc,
        CAST(m_date AS DATE) AS m_date,
        m_job,
        m_part,
        pt_desc1,
        pt_desc2,
        m_line,
        m_cp,
        m_kiln,
        unit,
        ${userlogSelectSql},
        sub_typ,
        rsn_desc,
        MAX(qtyp) AS qtyp,
        MAX(qtycomp) AS qtycomp,
        MAX(qtyscrp) AS qtyscrp,
        MAX(qtyrjct) AS qtyrjct,
        SUM(sub_qty) AS sub_qty
      FROM v_rpt_sort
      WHERE m_date >= @start
        AND m_date < DATEADD(day, 1, @end)
      GROUP BY
        m_doc,
        CAST(m_date AS DATE),
        m_job,
        m_part,
        pt_desc1,
        pt_desc2,
        m_line,
        m_cp,
        m_kiln,
        unit,
        ${userlogGroupBySql}
        sub_typ,
        rsn_desc
    `;

    const timeoutMs = 120000;
    const result = await runQueryWithTimeout(request, query, timeoutMs);
    const formattedData = transformProductionSummary(result.recordset || []);
    res.json(formattedData);
  } catch (err) {
    console.error('Production summary error:', err && err.message ? err.message : err);
    if (err && err.code === 'ETIMEOUT') {
      return res.status(504).json({ error: 'DB request timeout', detail: String(err) });
    }
    res.status(500).json({ error: String(err) });
  }
});



app.post('/query', async (req, res) => {
  try {
    const { query, db } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'Query required' });

    // WARNING: executing raw queries from clients is dangerous (SQL injection).
    // For demo purposes only. In production validate/parameterize queries.

    let profile = db ? String(db) : defaultProfile;
    if (db && !allowedProfiles.includes(profile)) {
      console.warn(`/query unknown profile='${profile}', falling back to default='${defaultProfile}'`);
      res.setHeader('X-DB-Fallback', 'true');
      profile = defaultProfile;
    }
    console.log(`/query incoming - profile=${profile} resolvedDB=${profiles[profile]?.database} poolKey=${getPoolKeyForProfile(profile)}`);

    const pool = await getPoolForProfile(profile);
    const request = pool.request();
    const timeoutMs = 60000;
    console.log(`Executing query (first200): ${String(query).slice(0, 200).replace(/\n/g, ' ')} (timeout ${timeoutMs}ms)`);
    const result = await runQueryWithTimeout(request, query, timeoutMs);
    res.json({ recordset: sanitizeRecordset(result.recordset), rowsAffected: result.rowsAffected });
  } catch (err) {
    console.error('Query error:', err && err.message ? err.message : err);
    // detect timeout
    if (err && err.code === 'ETIMEOUT') {
      return res.status(504).json({ error: 'DB request timeout', detail: String(err) });
    }
    res.status(500).json({ error: String(err) });
  }
});

// Health check / diagnostic endpoint that runs a trivial query and returns timing
app.get('/ping-db', async (req, res) => {
  try {
    const start = Date.now();
    let profile = req.query.db ? String(req.query.db) : defaultProfile;
    if (req.query.db && !allowedProfiles.includes(profile)) {
      console.warn(`/ping-db unknown profile='${profile}', falling back to default='${defaultProfile}'`);
      res.setHeader('X-DB-Fallback', 'true');
      profile = defaultProfile;
    }
    console.log(`/ping-db incoming - profile=${profile} resolvedDB=${profiles[profile]?.database} poolKey=${getPoolKeyForProfile(profile)}`);
    const pool = await getPoolForProfile(profile);
    const request = pool.request();
    const timeoutMs = 60000;
    const r = await runQueryWithTimeout(request, 'SELECT 1 AS ok', timeoutMs);
    const time = Date.now() - start;
    res.json({ ok: true, timeMs: time, result: sanitizeRecordset(r.recordset) });
  } catch (err) {
    console.error('Ping DB error:', err && err.message ? err.message : err);
    if (err && err.code === 'ETIMEOUT') {
      return res.status(504).json({ error: 'DB request timeout', detail: String(err) });
    }
    res.status(500).json({ error: String(err) });
  }
});

// Inspect tables in a profile's database (dev helper)
app.post('/inspect-tables', async (req, res) => {
  try {
    const { db, like } = req.body || {};
    let profile = db ? String(db) : defaultProfile;
    if (db && !allowedProfiles.includes(profile)) {
      console.warn(`/inspect-tables unknown profile='${profile}', falling back to default='${defaultProfile}'`);
      res.setHeader('X-DB-Fallback', 'true');
      profile = defaultProfile;
    }
    console.log(`/inspect-tables - profile=${profile} resolvedDB=${profiles[profile]?.database}`);
    const pool = await getPoolForProfile(profile);
    const request = pool.request();
    const pattern = like ? String(like) : '%';
    // escape single quotes for safe literal embed (dev helper only)
    const safe = `%${pattern.replace(/'/g, "''")}%`;
    const q = `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '${safe}'`;
    const r = await runQueryWithTimeout(request, q, 30000);
    res.json({ tables: sanitizeRecordset(r.recordset) });
  } catch (err) {
    console.error('Inspect tables error:', err && err.message ? err.message : err);
    res.status(500).json({ error: String(err) });
  }
});

// Also provide GET variant so PowerShell / browser can query easily: /inspect-tables?db=kiln&like=Kiln
app.get('/inspect-tables', async (req, res) => {
  try {
    const db = req.query.db;
    const like = req.query.like;
    let profile = db ? String(db) : defaultProfile;
    if (db && !allowedProfiles.includes(profile)) {
      console.warn(`/inspect-tables(GET) unknown profile='${profile}', falling back to default='${defaultProfile}'`);
      res.setHeader('X-DB-Fallback', 'true');
      profile = defaultProfile;
    }
    console.log(`/inspect-tables (GET) - profile=${profile} resolvedDB=${profiles[profile]?.database}`);
    const pool = await getPoolForProfile(profile);
    const request = pool.request();
    const pattern = like ? String(like) : '%';
    const safe = `%${pattern.replace(/'/g, "''")}%`;
    const q = `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '${safe}'`;
    const r = await runQueryWithTimeout(request, q, 30000);
    res.json({ tables: sanitizeRecordset(r.recordset) });
  } catch (err) {
    console.error('Inspect tables GET error:', err && err.message ? err.message : err);
    res.status(500).json({ error: String(err) });
  }
});

// --- Serve production frontend (dist/) ---
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback: ทุก route ที่ไม่ใช่ API จะส่ง index.html กลับไป
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.API_PORT || 3002;
app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${port}`);
  console.log(`LAN access: http://<YOUR-IP>:${port}`);
});

// Diagnostic: list registered routes
app.get('/__routes', (req, res) => {
  try {
    const routes = [];
    if (app._router && app._router.stack) {
      for (const layer of app._router.stack) {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
          routes.push({ path: layer.route.path, methods });
        }
      }
    }
    res.json({ routes });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// sanitize large results before sending to client to avoid creating huge JSON strings
function sanitizeRecordset(recordset, { maxRows = 1000000, maxFieldLength = 100000 } = {}) {
  if (!Array.isArray(recordset)) return recordset;
  const rows = recordset.slice(0, maxRows).map((row) => {
    const out = {};
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (v === null || v === undefined) {
        out[k] = v;
        continue;
      }
      // Buffers (varbinary) -> show placeholder with length
      if (Buffer.isBuffer(v)) {
        out[k] = `<Buffer length=${v.length}>`;
        continue;
      }
      // Large strings -> truncate
      if (typeof v === 'string') {
        if (v.length > maxFieldLength) {
          out[k] = v.slice(0, maxFieldLength) + `...(truncated ${v.length - maxFieldLength} chars)`;
        } else {
          out[k] = v;
        }
        continue;
      }
      // For other types (numbers, booleans, dates)
      if (v instanceof Date) out[k] = v.toISOString();
      else out[k] = v;
    }
    return out;
  });
  return rows;
}
