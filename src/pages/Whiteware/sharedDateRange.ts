export type IsoDateRange = {
    start: string;
    end: string;
};

type DatePickerThemeFlags = {
    isDark: boolean;
    isJapan: boolean;
};

export const getEmptyDateRange = (): IsoDateRange => ({ start: '', end: '' });

export const getTodayDateRange = (): IsoDateRange => {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
};

export const parseIsoDateToLocal = (value?: string): Date | undefined => {
    if (!value) return undefined;
    const [yyyy, mm, dd] = value.split('-').map(Number);
    if (!yyyy || !mm || !dd) return undefined;
    return new Date(yyyy, mm - 1, dd);
};

export const formatLocalDateToIso = (date?: Date): string => {
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const getDatePickerPanelClass = ({ isDark, isJapan }: DatePickerThemeFlags): string => (
    isJapan
        ? 'rounded-xl border border-[#8D6E63] bg-[#F3EAD3] text-[#3E2723] shadow-2xl'
        : (isDark
            ? 'rounded-xl border border-slate-700 bg-[#020817] text-slate-100 shadow-2xl'
            : 'rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl')
);

export const getDatePickerClassNames = ({ isDark, isJapan }: DatePickerThemeFlags): Record<string, string> => {
    const navHover = isJapan ? 'hover:bg-[#E6D7B5]' : (isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50');
    const headText = isJapan ? 'text-[#5D4037]' : (isDark ? 'text-slate-300' : 'text-gray-500');
    const dayText = isJapan ? 'text-[#3E2723]' : (isDark ? 'text-slate-100' : 'text-gray-800');
    const dayHover = isJapan ? 'hover:bg-[#E6D7B5]' : (isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50');
    const daySelected = isJapan
        ? 'bg-[#D64045] text-[#F3EAD3] hover:bg-[#bf373c] focus:bg-[#bf373c]'
        : (isDark
            ? 'bg-slate-500 text-white hover:bg-slate-500 focus:bg-slate-500'
            : 'bg-blue-600 text-white hover:bg-blue-600 focus:bg-blue-600');
    const dayToday = isJapan
        ? 'bg-[#E6D7B5] text-[#3E2723]'
        : (isDark ? 'bg-slate-800 text-slate-100' : 'bg-blue-100 text-blue-900');
    const dayOutside = isJapan ? 'text-[#8D6E63] opacity-70' : (isDark ? 'text-slate-500 opacity-70' : 'text-gray-400 opacity-80');
    const dayDisabled = isJapan ? 'text-[#8D6E63] opacity-45' : (isDark ? 'text-slate-600 opacity-50' : 'text-gray-300 opacity-70');
    const dropdownClass = isJapan
        ? 'h-7 rounded-md border border-[#C9B992] bg-[#F3EAD3] px-2 text-sm text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D64045]'
        : (isDark
            ? 'h-7 rounded-md border border-slate-600 bg-[#0f172a] px-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400'
            : 'h-7 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400');

    return {
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'hidden',
        caption_dropdowns: 'flex items-center gap-2',
        nav: 'space-x-1 flex items-center',
        nav_button: `h-7 w-7 bg-transparent p-0 opacity-90 hover:opacity-100 border border-transparent rounded-md ${navHover}`,
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        head_row: 'flex mt-1',
        head_cell: `${headText} rounded-md w-9 font-medium text-[0.9rem]`,
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative',
        day: `h-9 w-9 p-0 rounded-md ${dayText} font-medium ${dayHover}`,
        day_selected: daySelected,
        day_today: dayToday,
        day_outside: dayOutside,
        day_disabled: dayDisabled,
        day_hidden: 'invisible',
        dropdown: dropdownClass,
        vhidden: 'sr-only'
    };
};
