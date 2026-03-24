// ──────────────────────────────────────────────
// Shared Types, Constants & Utilities for Kiln Dashboard
// Only used by files in src/pages/Kiln/
// ──────────────────────────────────────────────

// ─── Wkctr → Kiln Name Mapping (O(1) lookup) ───
export const KILN_WKCTR_MAP = new Map<string, string>([
    ['5231', 'TCK1'],
    ['5302', 'TCK3'],
    ['5301', 'TCK2'],
    ['5230', 'DT'],
    ['5190', 'BC1'],
    ['5300', 'RH2'],
    ['5220', 'RH1'],
    ['5210', 'EIS'],
    ['5200', 'BC2'],
]);

export const FORMM_WKCTR_MAP = new Map<string, string>([
    ['5140', 'K1'],
    ['5150', 'INTER'],
    ['5165', 'DT(B)'],
    ['5221', 'RH3'],
]);

// ─── Category Colors ───
export const CATEGORY_COLORS: Record<string, string> = {
    Biscuit: '#3b82f6',  // blue
    Glaze: '#f59e0b',    // amber
    Decal: '#8b5cf6',    // purple
    Other: '#6b7280',    // gray
};

export const QUALITY_COLORS = {
    complete: '#22c55e',  // green
    scrap: '#ef4444',     // red
    reject: '#f97316',    // orange
};

// ─── Types ───
export interface KilnProductionRecord {
    kilnName: string;
    category: 'Biscuit' | 'Glaze' | 'Decal';
    docType: 'Normal' | 'Repair';
    trx_date: string;
    qtyProc: number;
    qtyMoved: number;
    qtyScrap: number;
    qtyReject: number;
}

export interface QualityRecord {
    m_kiln: string;
    wareType: 'WW' | 'DW';
    computed_cp: string;
    totalQtyp: number;
    totalQtycomp: number;
    totalScrap: number;
    totalReject: number;
}

export interface KilnSummary {
    kilnName: string;
    category: string;
    totalQtyProc: number;
    totalQtyMoved: number;
    totalQtyScrap: number;
    totalQtyReject: number;
}

export interface CategoryTotal {
    name: string;
    value: number;
    color: string;
}

export interface MonthlyData {
    month: string;
    Biscuit: number;
    Glaze: number;
    Decal: number;
}

export interface TypeRatioData {
    normal: number;
    repair: number;
    total: number;
}

export interface QualityKilnMetrics {
    m_kiln: string;
    totalQtyp: number;
    totalQtycomp: number;
    totalScrap: number;
    totalReject: number;
    compRate: number;
    scrapRate: number;
    rejectRate: number;
}

export interface WeeklyQualityRecord {
    m_kiln: string;
    computed_cp: string;
    trx_date: string;   // 'YYYY-MM-DD'
    totalQtyp: number;
    totalQtycomp: number;
    totalScrap: number;
    totalReject: number;
}

// ─── Helper: resolve Wkctr to kiln name ───
export function resolveKilnName(wkctr: string, map: Map<string, string>): string | null {
    if (!wkctr || wkctr.length < 5) return null;
    const code = wkctr.substring(1, 5);
    return map.get(code) ?? null;
}

// ─── Helper: API base URL ───
export function getApiBase(): string {
    const envApi = (import.meta as any)?.env?.VITE_API_URL;
    if (envApi) return envApi;
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    return 'http://localhost:3001';
}

// ─── Helper: format date ───
export function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
}

// ─── Helper: format large numbers ───
export function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
}
