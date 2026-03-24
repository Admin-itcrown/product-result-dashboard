import type { DbItem } from './ProductionReport';

export type SortingMode = 'normal' | 'frit';
export type ExpandedChartType = 'monthly' | 'kiln' | null;

export const INITIAL_DATA: DbItem[] = [];

export const CYCLE_TABS = [
    { id: 1, label: '1st Fire', shortLabel: '1st' },
    { id: 3, label: 'P1 Firing', shortLabel: 'P1' },
    { id: 4, label: 'P2 Firing', shortLabel: 'P2' },
    { id: 5, label: 'P3 Firing', shortLabel: 'P3' },
    { id: 6, label: 'P4 Firing', shortLabel: 'P4' },
    { id: 7, label: 'P5 Firing', shortLabel: 'P5' },
] as const;

export const FRIT_UNITS = ['W524003', 'W524102', 'W529005', 'W59005'] as const;
export const NORMAL_UNITS = ['W524001', 'W524002', 'W524101', 'W529001'] as const;
export const FRIT_USERLOG_WHITELIST = ['somboon', 'somboonb'] as const;
export const FRIT_USERLOG_BYPASS_UNITS = ['W529005', 'W59005'] as const;
