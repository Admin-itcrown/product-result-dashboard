// ============================================================
// searchUtils.ts — Advanced Search Utilities
// ============================================================

export interface SearchDataRow {
    detail1?: string;
    mDoc?: string;
    _tokens?: string[];
    [key: string]: unknown;
}

const SEARCH_TOKEN_SEPARATOR_REGEX = /[,/\s-]+/;

/**
 * Parse pt_desc1 into search tokens.
 *
 * Rules:
 *  1. Remove first prefix before the first space (e.g. "W/W", "D/W")
 *  2. Replace "(" and ")" with spaces
 *  3. Split by comma, slash, hyphen, and space
 *  4. Remove empty strings and duplicates
 *  5. Convert to uppercase
 *
 * Example:
 *   "W/W JBSB77,JBSC09/T0040(VB)"
 *   → ["JBSB77", "JBSC09", "T0040", "VB"]
 */
export function parsePtDesc1Tokens(desc: string): string[] {
    if (!desc || typeof desc !== 'string') return [];

    // Step 1: Remove the first prefix (everything before the first space)
    const firstSpaceIdx = desc.indexOf(' ');
    // const body = firstSpaceIdx >= 0 ? desc.substring(firstSpaceIdx + 1) : desc; // Original logic
    // But let's check exact implementation from JS
    let body = desc;
    if (firstSpaceIdx >= 0) {
        body = desc.substring(firstSpaceIdx + 1);
    }

    // Step 2: Replace parentheses with spaces
    const cleaned = body.replace(/[()]/g, ' ');

    // Step 3: Split by comma, slash, or whitespace
    const rawTokens = cleaned.split(SEARCH_TOKEN_SEPARATOR_REGEX);

    // Step 4 & 5: Filter empty, uppercase, deduplicate
    const seen = new Set<string>();
    const tokens: string[] = [];
    for (const t of rawTokens) {
        const upper = t.trim().toUpperCase();
        if (upper && !seen.has(upper)) {
            seen.add(upper);
            tokens.push(upper);
        }
    }
    return tokens;
}

/**
 * Parse user keyword input into exact tokens.
 * Accepts spaces, commas, slash, and hyphen as separators.
 * Supports OR token groups with "|" for search (e.g. A|B|C).
 *
 * Examples:
 *   "RBXA82,JBXA82" -> ["RBXA82", "JBXA82"]
 *   "JBXA82/T0040" -> ["JBXA82", "T0040"]
 */
export function parseKeywordTokens(keywordString: string): string[] {
    if (!keywordString || !keywordString.trim()) return [];

    const normalized = keywordString.replace(/[()]/g, ' ');

    const rawTokens = normalized
        .toUpperCase()
        .split(SEARCH_TOKEN_SEPARATOR_REGEX)
        .map(token => token.trim())
        .filter(token => token.length > 0);

    const uniqueTokens: string[] = [];
    const seen = new Set<string>();
    rawTokens.forEach(token => {
        if (!seen.has(token)) {
            seen.add(token);
            uniqueTokens.push(token);
        }
    });

    return uniqueTokens;
}

/**
 * Build a token index from the dataset.
 * Returns:
 *   {
 *     tokenToRows: Map<string, Set<number>>,  // token → row indices
 *     allTokens: string[]                       // sorted unique token list
 *   }
 */
export function buildTokenIndex<T extends SearchDataRow>(data: T[]): { tokenToRows: Map<string, Set<number>>, allTokens: string[] } {
    const tokenToRows = new Map<string, Set<number>>();
    const allTokensSet = new Set<string>();

    data.forEach((row, idx) => {
        const tokens = parsePtDesc1Tokens(row.detail1 || '');
        // Store parsed tokens on the row for later use
        row._tokens = tokens;

        tokens.forEach(token => {
            allTokensSet.add(token);
            if (!tokenToRows.has(token)) {
                tokenToRows.set(token, new Set<number>());
            }
            tokenToRows.get(token)!.add(idx);
        });
    });

    const allTokens = Array.from(allTokensSet).sort();
    return { tokenToRows, allTokens };
}

/**
 * Search by exact tokens (AND logic).
 * Each keyword must exactly match a token in the row.
 * Uses the _tokens property set by buildTokenIndex on each row.
 *
 * "JBSB77 JBSC09" → row must contain BOTH "JBSB77" AND "JBSC09"
 * "JBS" → will NOT match "JBSB77" (exact match only)
 *
 * Works with any data array (including pre-filtered subsets).
 */
export function searchByTokens<T extends SearchDataRow>(keywordString: string, _tokenIndex: unknown, data: T[]): T[] {
    if (!keywordString || !keywordString.trim()) return data;

    const keywordGroups = parseKeywordTokens(keywordString)
        .map(token => token.split('|').map(part => part.trim()).filter(Boolean))
        .filter(group => group.length > 0);

    if (keywordGroups.length === 0) return data;

    // Filter rows where _tokens contains ALL groups.
    // Each group passes when ANY token in that group matches.
    return data.filter(row => {
        const rowTokens = row._tokens || parsePtDesc1Tokens(row.detail1 || '');
        return keywordGroups.every(group => group.some(option => rowTokens.includes(option)));
    });
}

/**
 * Get token suggestions based on partial input.
 * Returns tokens that START WITH the partial text (prefix match).
 * Case-insensitive.
 *
 * "JBS" → ["JBSB77", "JBSC09"]
 */
export function getSuggestions(partial: string, allTokens: string[]): string[] {
    if (!partial || !partial.trim()) return [];

    const upper = partial.trim().toUpperCase();

    // Don't show suggestions if the input is already an exact token
    // (user has finished typing this token)
    if (allTokens.includes(upper)) return [];

    return allTokens.filter(token => token.startsWith(upper));
}

/**
 * Filter data by m_doc (partial, case-insensitive match).
 *
 * "PD" → matches PD12345, PD12254
 */
export function filterByMDoc<T extends SearchDataRow>(data: T[], query: string): T[] {
    if (!query || !query.trim()) return data;

    const q = query.trim().toLowerCase();
    return data.filter(row => row.mDoc && row.mDoc.toLowerCase().includes(q));
}
