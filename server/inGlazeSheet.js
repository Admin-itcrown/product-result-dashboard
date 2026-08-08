/** In-Glaze Firing daily qty from Google Sheet CSV. */

export const IN_GLAZE_SHEET_ID = '1Fya_wHKN6myQL_k2FtJdpmvMDFffX6OFvFQvpp9Uz7A';
export const IN_GLAZE_SHEET_GID = '0';

export function getInGlazeCsvUrl() {
  const custom = process.env.IN_GLAZE_CSV_URL?.trim();
  if (custom) return custom;
  return `https://docs.google.com/spreadsheets/d/${IN_GLAZE_SHEET_ID}/export?format=csv&gid=${IN_GLAZE_SHEET_GID}`;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseNumber(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/,/g, '').replace(/"/g, '').trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function convertBuddhistYear(y) {
  return y > 2400 ? y - 543 : y;
}

/** Accepts D/M/YYYY (Buddhist) or YYYY-MM-DD → ISO date */
export function normalizeInGlazeDate(dateStr) {
  const cleaned = String(dateStr || '').replace(/"/g, '').trim();
  if (!cleaned) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [yStr, m, d] = cleaned.split('-');
    const y = convertBuddhistYear(parseInt(yStr, 10));
    return `${y}-${m}-${d}`;
  }

  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, yStr] = dmy;
    const y = convertBuddhistYear(parseInt(yStr, 10));
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const dt = new Date(cleaned);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return '';
}

export function normalizeInGlazeKiln(name) {
  const t = String(name || '').replace(/\s+/g, '').toUpperCase();
  if (!t) return '';
  if (t === 'TCK2' || t === 'TCK02') return 'TCK2';
  if (t === 'TCK3' || t === 'TCK03') return 'TCK3';
  if (t === 'TCK1' || t === 'TCK01') return 'TCK1';
  return String(name || '').trim().toUpperCase();
}

/**
 * Parse sheet CSV:
 * Date, Kiln, 08:00-20:00, 20:00-08:00, Total
 */
export function parseInGlazeCSV(csvText) {
  const lines = String(csvText || '').replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const dateIdx = headers.findIndex((h) => h === 'date' || h.includes('วันที่'));
  const kilnIdx = headers.findIndex((h) => h === 'kiln' || h.includes('เตา'));
  // Prefer column that STARTS with shift time so "08:00-20:00" ≠ night
  let dayIdx = headers.findIndex((h) => h.startsWith('08:00') || h.startsWith('08.00'));
  let nightIdx = headers.findIndex((h) => h.startsWith('20:00') || h.startsWith('20.00'));
  if (dayIdx < 0) dayIdx = headers.findIndex((h) => h.includes('day') && !h.includes('night'));
  if (nightIdx < 0) nightIdx = headers.findIndex((h) => h.includes('night'));
  const totalIdx = headers.findIndex((h) => h === 'total' || h.includes('รวม'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, ''));
    if (values.length < 2) continue;

    const date = normalizeInGlazeDate(dateIdx >= 0 ? values[dateIdx] : values[0]);
    const kiln = normalizeInGlazeKiln(kilnIdx >= 0 ? values[kilnIdx] : values[1]);
    if (!date || !kiln) continue;

    const dayShift = dayIdx >= 0 ? parseNumber(values[dayIdx]) : 0;
    const nightShift = nightIdx >= 0 ? parseNumber(values[nightIdx]) : 0;
    let total = totalIdx >= 0 ? parseNumber(values[totalIdx]) : 0;
    if (total <= 0) total = dayShift + nightShift;
    if (total <= 0 && dayShift <= 0 && nightShift <= 0) continue;

    rows.push({
      date,
      kiln,
      dayShift,
      nightShift,
      total,
    });
  }
  return rows;
}

let cache = {
  fetchedAt: 0,
  rows: /** @type {ReturnType<typeof parseInGlazeCSV>} */ ([]),
};

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchInGlazeRows({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.rows.length > 0 && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { rows: cache.rows, cached: true, fetchedAt: cache.fetchedAt };
  }

  const url = getInGlazeCsvUrl();
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'text/csv' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch In-Glaze sheet: ${res.status}`);
  }
  const text = await res.text();
  const rows = parseInGlazeCSV(text);
  cache = { fetchedAt: now, rows };
  return { rows, cached: false, fetchedAt: now };
}

export function filterInGlazeByDate(rows, startDate, endDate) {
  return rows.filter((r) => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });
}

export function getInGlazeMaxDate(rows) {
  let max = '';
  for (const r of rows) {
    if (r.date && (!max || r.date > max)) max = r.date;
  }
  return max;
}
