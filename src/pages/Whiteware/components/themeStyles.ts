export type WhitewareTheme = 'light' | 'dark' | 'japan';

type ThemeTriplet = {
    light: string;
    dark: string;
    japan: string;
};

const normalizeTheme = (theme: string): WhitewareTheme => {
    if (theme === 'dark' || theme === 'japan') return theme;
    return 'light';
};

export const pickThemeClass = (theme: string, classes: ThemeTriplet): string => {
    const mode = normalizeTheme(theme);
    if (mode === 'japan') return classes.japan;
    if (mode === 'dark') return classes.dark;
    return classes.light;
};

export type SortdetailsThemeClasses = {
    mainSurface: string;
    topBar: string;
    dateRangePanel: string;
    dateText: string;
    dateIcon: string;
    dateSeparator: string;
    filterBar: string;
    filterLabel: string;
    filterDivider: string;
    contentArea: string;
    emptyStateText: string;
    emptyStateIconBg: string;
    bottomTabsBar: string;
};

export const getSortdetailsThemeClasses = (theme: string): SortdetailsThemeClasses => ({
    mainSurface: pickThemeClass(theme, {
        light: 'bg-slate-200/80 text-gray-900',
        dark: 'bg-gray-900 text-gray-100',
        japan: 'bg-[#7CA592] text-[#2D3748]'
    }),
    topBar: pickThemeClass(theme, {
        light: 'bg-blue-600',
        dark: 'bg-gray-900 border-b border-gray-800',
        japan: 'bg-[#2F4F4F] border-b border-[#8D6E63]'
    }),
    dateRangePanel: pickThemeClass(theme, {
        light: 'bg-blue-700/30 border-blue-500/30',
        dark: 'bg-gray-800 border-gray-700',
        japan: 'bg-[#F3EAD3]/20 border-[#F3EAD3]/50'
    }),
    dateText: pickThemeClass(theme, {
        light: 'text-white',
        dark: 'text-white',
        japan: 'text-[#F3EAD3]'
    }),
    dateIcon: pickThemeClass(theme, {
        light: 'text-blue-200',
        dark: 'text-blue-200',
        japan: 'text-[#F3EAD3]'
    }),
    dateSeparator: pickThemeClass(theme, {
        light: 'text-blue-200',
        dark: 'text-blue-200',
        japan: 'text-[#F3EAD3]'
    }),
    filterBar: pickThemeClass(theme, {
        light: 'bg-blue-50/50 border-blue-100',
        dark: 'bg-gray-800/30 border-gray-700',
        japan: 'bg-[#2F4F4F]/60 border-[#8D6E63]'
    }),
    filterLabel: pickThemeClass(theme, {
        light: 'text-blue-600',
        dark: 'text-gray-400',
        japan: 'text-[#F3EAD3]'
    }),
    filterDivider: pickThemeClass(theme, {
        light: 'bg-gray-300',
        dark: 'bg-gray-600',
        japan: 'bg-[#F3EAD3]/30'
    }),
    contentArea: pickThemeClass(theme, {
        light: 'bg-slate-200/80',
        dark: 'bg-gray-900',
        japan: 'bg-[#7CA592]/90'
    }),
    emptyStateText: pickThemeClass(theme, {
        light: 'text-gray-400',
        dark: 'text-gray-600',
        japan: 'text-[#F3EAD3]'
    }),
    emptyStateIconBg: pickThemeClass(theme, {
        light: 'bg-gray-200',
        dark: 'bg-gray-800',
        japan: 'bg-[#F3EAD3]/20'
    }),
    bottomTabsBar: pickThemeClass(theme, {
        light: 'bg-white border-gray-200',
        dark: 'bg-gray-800 border-gray-700',
        japan: 'bg-[#2F4F4F] border-[#8D6E63]'
    })
});

export type ProductionReportThemeClasses = {
    textColor: string;
    subTextColor: string;
    cardBg: string;
    headerBg: string;
    accentColor: string;
    tagBg: string;
};

export const getProductionReportThemeClasses = (theme: string): ProductionReportThemeClasses => ({
    textColor: pickThemeClass(theme, {
        light: 'text-gray-800',
        dark: 'text-gray-100',
        japan: 'text-[#3E2723]'
    }),
    subTextColor: pickThemeClass(theme, {
        light: 'text-gray-500',
        dark: 'text-gray-400',
        japan: 'text-[#5D4037]'
    }),
    cardBg: pickThemeClass(theme, {
        light: 'bg-white border-gray-200',
        dark: 'bg-gray-800 border-gray-700',
        japan: 'bg-[#F3EAD3] border-[#8D6E63]'
    }),
    headerBg: pickThemeClass(theme, {
        light: 'bg-gray-50 border-gray-200',
        dark: 'bg-gray-700 border-gray-600',
        japan: 'bg-[#E6D7B5] border-[#8D6E63]'
    }),
    accentColor: pickThemeClass(theme, {
        light: 'text-blue-500',
        dark: 'text-blue-500',
        japan: 'text-[#D64045]'
    }),
    tagBg: pickThemeClass(theme, {
        light: 'bg-blue-100 text-blue-700 border-blue-200',
        dark: 'bg-blue-900/40 text-blue-300 border-blue-800',
        japan: 'bg-[#D64045] text-[#F3EAD3] border-[#8D6E63]'
    })
});
