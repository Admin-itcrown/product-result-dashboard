import type { DbItem } from './ProductionReport';
import {
    FRIT_UNITS,
    NORMAL_UNITS,
    FRIT_USERLOG_WHITELIST,
    FRIT_USERLOG_BYPASS_UNITS,
    type SortingMode
} from './sortdetailsConstants';

export type SpecFilterIgnore = 'system' | 'kiln' | 'model' | 'customer' | 'job' | 'line' | 'unit';

export type DynamicSpecOptions = {
    systemIds: string[];
    kilnIds: string[];
    modelNames: string[];
    customers: string[];
    jobs: string[];
    lines: string[];
    units: string[];
};

export const formatDisplayDate = (dateString?: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export const uniqueSorted = (values: string[]): string[] =>
    Array.from(new Set(values.filter(Boolean))).sort();

const PREFIX_GROUP_142 = new Set(['142', '144', '146']);
const PREFIX_GROUP_143 = new Set(['143', '145', '147']);

const normalizeItemPrefix = (value?: string): string =>
    String(value || '').trim().slice(0, 3);

const toDisplayPrefixGroup = (prefix: string): string => {
    if (PREFIX_GROUP_142.has(prefix)) return '142';
    if (PREFIX_GROUP_143.has(prefix)) return '143';
    return prefix;
};

const matchesPrefixGroup = (itemId: string, selectedPrefix: string): boolean => {
    const normalizedItemId = String(itemId || '').trim();
    const itemPrefix = normalizeItemPrefix(normalizedItemId);
    if (!itemPrefix) return false;

    const normalizedSelected = selectedPrefix.trim();
    if (normalizedSelected === '142') {
        return ['142', '143'].includes(itemPrefix);
    }

    const normalizedGroup = toDisplayPrefixGroup(normalizedSelected);
    if (normalizedGroup === '142') return PREFIX_GROUP_142.has(itemPrefix);
    if (normalizedGroup === '143') return PREFIX_GROUP_143.has(itemPrefix);

    return normalizedItemId.startsWith(normalizedGroup);
};

export const getSortedPrefixes = (data: DbItem[]): string[] => {
    const prefixes = new Set<string>();
    data.forEach((item) => {
        const itemPrefix = normalizeItemPrefix(item.itemId);
        if (itemPrefix) {
            prefixes.add(toDisplayPrefixGroup(itemPrefix));
        }
    });

    const has142Or143Group = Array.from(prefixes).some((prefix) => prefix === '142' || prefix === '143');
    if (has142Or143Group) {
        prefixes.add('142');
        prefixes.add('143');
    }

    const prefixArray = Array.from(prefixes).sort();
    const sortedPrefixes: string[] = [];

    if (prefixArray.includes('142')) sortedPrefixes.push('142');
    if (prefixArray.includes('143')) sortedPrefixes.push('143');
    prefixArray.forEach((prefix) => {
        if (prefix !== '142' && prefix !== '143') sortedPrefixes.push(prefix);
    });
    return sortedPrefixes;
};

const splitUserlogs = (value?: string): string[] =>
    String(value || '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);

const normalizeUpper = (value?: string): string =>
    String(value || '').trim().toUpperCase();

export const applySortingModeFilter = (data: DbItem[], sortingMode: SortingMode): DbItem[] => {
    let filtered = [...data];

    if (sortingMode === 'frit') {
        const fritUnits = new Set(FRIT_UNITS.map((unit) => unit.toUpperCase()));
        const whitelist = new Set(FRIT_USERLOG_WHITELIST.map((name) => name.toLowerCase()));
        const bypassUnits = new Set(FRIT_USERLOG_BYPASS_UNITS.map((unit) => unit.toUpperCase()));

        filtered = filtered.filter((item) => fritUnits.has(normalizeUpper(item.unit)));

        const hasWhitelistedUserlog = filtered.some((item) => {
            if (bypassUnits.has(normalizeUpper(item.unit))) return false;
            const userlogs = splitUserlogs(item.userlog);
            return userlogs.some((userlog) => whitelist.has(userlog));
        });

        // Apply userlog whitelist only when there are matching whitelisted logs in this scope.
        // This prevents accidental zero-result when source data has empty/new userlogs.
        if (hasWhitelistedUserlog) {
            filtered = filtered.filter((item) => {
                if (bypassUnits.has(normalizeUpper(item.unit))) return true;
                const userlogs = splitUserlogs(item.userlog);
                if (userlogs.length === 0) return true;
                return userlogs.some((userlog) => whitelist.has(userlog));
            });
        }
    } else {
        const normalUnits = new Set(NORMAL_UNITS.map((unit) => unit.toUpperCase()));
        filtered = filtered.filter((item) => normalUnits.has(normalizeUpper(item.unit)));
    }

    return filtered;
};

export const applyPrefixAndUnitPrefixFilters = (
    data: DbItem[],
    selectedPrefix: string,
    selectedUnitPrefix: string
): DbItem[] => {
    let filtered = [...data];
    const normalizedPrefix = selectedPrefix.trim();
    const normalizedUnitPrefix = selectedUnitPrefix.trim().toUpperCase();

    if (normalizedPrefix !== 'ALL') {
        filtered = filtered.filter((item) => matchesPrefixGroup(String(item.itemId || ''), normalizedPrefix));
    }

    if (normalizedUnitPrefix !== 'ALL') {
        filtered = filtered.filter((item) =>
            normalizeUpper(item.unit).startsWith(normalizedUnitPrefix)
        );
    }

    return filtered;
};

export const getDynamicSpecOptions = (
    data: DbItem[],
    getDataBySpecFilters: (rows: DbItem[], ignore: SpecFilterIgnore | null) => DbItem[]
): DynamicSpecOptions => ({
    systemIds: uniqueSorted(getDataBySpecFilters(data, 'system').map((item) => item.mDoc || '')),
    kilnIds: uniqueSorted(
        getDataBySpecFilters(data, 'kiln')
            .map((item) => item.kiln || '')
            .filter((kiln) => normalizeUpper(kiln) !== 'REWORK')
    ),
    modelNames: uniqueSorted(getDataBySpecFilters(data, 'model').map((item) => item.detail1 || '')),
    customers: uniqueSorted(getDataBySpecFilters(data, 'customer').map((item) => item.detail2 || '')),
    jobs: uniqueSorted(getDataBySpecFilters(data, 'job').map((item) => item.job || '')),
    lines: uniqueSorted(getDataBySpecFilters(data, 'line').map((item) => item.line || '')),
    units: uniqueSorted(getDataBySpecFilters(data, 'unit').map((item) => item.unit || ''))
});

const escapeCsv = (value: unknown): string => {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

export const buildExportCsvContent = (rows: DbItem[]): string => {
    const headers = [
        'Date', 'SystemID', 'Cycle', 'Unit', 'Line', 'Kiln',
        'Job', 'ItemId', 'Model', 'Customer',
        'Process', 'Complete', 'Scrap', 'Reject'
    ];

    const csvRows = rows.map((row) => ([
        row.date || '',
        row.mDoc || '',
        row.cycle || '',
        row.unit || '',
        row.line || '',
        row.kiln || '',
        row.job || '',
        row.itemId || '',
        row.detail1 || '',
        row.detail2 || '',
        row.process ?? 0,
        row.complete ?? 0,
        row.scrap ?? 0,
        row.reject ?? 0
    ]));

    return [
        headers.map(escapeCsv).join(','),
        ...csvRows.map((row) => row.map(escapeCsv).join(','))
    ].join('\n');
};

export const buildExportFileName = (
    sortingMode: SortingMode,
    dateRange: { start: string; end: string }
): string => {
    const safeStart = (dateRange.start || 'start').replace(/[^0-9-]/g, '');
    const safeEnd = (dateRange.end || 'end').replace(/[^0-9-]/g, '');
    return `sorting_${sortingMode}_${safeStart}_${safeEnd}.csv`;
};
