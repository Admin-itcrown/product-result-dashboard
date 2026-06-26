import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, FileText, Tag, ChevronRight } from 'lucide-react';
import { getSuggestions, parseKeywordTokens } from '../../../utils/searchUtils';

interface AdvancedSearchProps {
    allTokens?: string[];
    mDocQuery?: string;
    onMDocChange?: (value: string) => void;
    tokenQuery?: string;
    onTokenQueryChange: (value: string) => void;
    onTokenSearch: (query: string) => void;
    theme?: 'light' | 'dark' | 'japan';
    showMDoc?: boolean;
}

/**
 * AdvancedSearch — Two-input search panel:
 *  1. m_doc filter (partial match)
 *  2. Token search (exact AND match with suggestions)
 */
const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
    allTokens = [],
    mDocQuery = '',
    onMDocChange = () => {},
    tokenQuery = '',
    onTokenQueryChange,
    onTokenSearch,
    theme = 'light',
    showMDoc = true
}) => {
    const isDark = theme === 'dark';
    const isJapan = theme === 'japan';

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const tokenInputRef = useRef<HTMLInputElement>(null);

    // Get the current token fragment being typed (supports space, comma, slash, hyphen)
    const currentTokenFragment = useMemo(() => {
        const match = tokenQuery.match(/(?:^|[,/\s()-]+)([^,/\s()-]*)$/);
        return match?.[1] || '';
    }, [tokenQuery]);

    // Compute suggestions based on current fragment
    const suggestions = useMemo(() => {
        if (!currentTokenFragment) return [];
        return getSuggestions(currentTokenFragment, allTokens).slice(0, 12);
    }, [currentTokenFragment, allTokens]);

    // Show suggestions when there are results
    useEffect(() => {
        setShowSuggestions(suggestions.length > 0);
        setActiveSuggestionIdx(-1);
    }, [suggestions]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectSuggestion = (token: string) => {
        // Replace only the trailing fragment to preserve separators already typed.
        const match = tokenQuery.match(/^(.*?)([^,/\s()-]*)$/);
        const prefix = match?.[1] || '';
        const newQuery = `${prefix}${token} `;
        onTokenQueryChange(newQuery);
        setShowSuggestions(false);
        tokenInputRef.current?.focus();
    };

    const handleTokenSearchSubmit = (overrideQuery?: string) => {
        setShowSuggestions(false);
        onTokenSearch(overrideQuery ?? tokenQuery);
    };

    const handleTokenKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIdx(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIdx(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
            } else if (e.key === 'Enter' && activeSuggestionIdx >= 0) {
                e.preventDefault();
                handleSelectSuggestion(suggestions[activeSuggestionIdx]);
                return;
            } else if (e.key === 'Tab' && suggestions.length > 0) {
                e.preventDefault();
                const idx = activeSuggestionIdx >= 0 ? activeSuggestionIdx : 0;
                handleSelectSuggestion(suggestions[idx]);
                return;
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleTokenSearchSubmit(tokenQuery);
        }
    };

    // Theme classes
    const inputClasses = isJapan
        ? 'bg-[#F3EAD3] text-[#3E2723] placeholder-[#8D6E63] focus:ring-[#D64045] border-[#8D6E63]'
        : isDark
            ? 'bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-blue-500 border-gray-600'
            : 'bg-white text-gray-700 placeholder-gray-400 focus:ring-blue-400 border-gray-200';

    const dropdownClasses = isJapan
        ? 'bg-[#F3EAD3] border-[#8D6E63] shadow-xl'
        : isDark
            ? 'bg-gray-800 border-gray-700 shadow-xl'
            : 'bg-white border-gray-200 shadow-xl';

    const suggestionItemClasses = (isActive: boolean) => {
        const base = 'px-4 py-2.5 cursor-pointer flex items-center gap-2 transition-colors text-sm';
        if (isActive) {
            return isJapan
                ? `${base} bg-[#D64045]/20 text-[#3E2723]`
                : isDark
                    ? `${base} bg-blue-900/40 text-blue-300`
                    : `${base} bg-blue-50 text-blue-700`;
        }
        return isJapan
            ? `${base} text-[#3E2723] hover:bg-[#E6D7B5]`
            : isDark
                ? `${base} text-gray-300 hover:bg-gray-700`
                : `${base} text-gray-700 hover:bg-gray-50`;
    };

    const labelClasses = isJapan
        ? 'text-[#F3EAD3]/80'
        : isDark
            ? 'text-gray-400'
            : 'text-blue-200';

    const tagClasses = isJapan
        ? 'bg-[#D64045]/20 text-[#D64045] border-[#D64045]/30'
        : isDark
            ? 'bg-blue-900/40 text-blue-300 border-blue-700'
            : 'bg-blue-100 text-blue-700 border-blue-200';

    // Parse entered tokens for display as pills
    const enteredTokens = parseKeywordTokens(tokenQuery)
        .filter(token => allTokens.includes(token));

    return (
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center w-full md:w-auto">

            {showMDoc && (
                <div className="relative">
                    <label className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 block ${labelClasses}`}>
                        m_doc
                    </label>
                    <div className="relative">
                        <FileText className={`absolute left-2.5 top-2.5 w-4 h-4 ${isJapan ? 'text-[#8D6E63]' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="PD12345..."
                            className={`w-full md:w-36 pl-9 pr-8 py-2 rounded-lg border focus:ring-2 outline-none transition-all text-sm font-mono ${inputClasses}`}
                            value={mDocQuery}
                            onChange={(e) => onMDocChange(e.target.value)}
                        />
                        {mDocQuery && (
                            <button
                                onClick={() => onMDocChange('')}
                                className={`absolute right-2 top-2.5 ${isJapan ? 'text-[#8D6E63] hover:text-[#D64045]' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- Token Search Input --- */}
            <div className="relative flex-1" ref={suggestionsRef}>
                <div className="relative">
                    <Tag className={`absolute left-2.5 top-2.5 w-4 h-4 ${isJapan ? 'text-[#8D6E63]' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                        ref={tokenInputRef}
                        type="text"
                        placeholder="JBSB77,JBSC09/T0040..."
                        className={`w-full md:w-52 pl-9 pr-8 py-2 rounded-lg border focus:ring-2 outline-none transition-all text-sm font-mono ${inputClasses}`}
                        value={tokenQuery}
                        onChange={(e) => onTokenQueryChange(e.target.value)}
                        onKeyDown={handleTokenKeyDown}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    />
                    {tokenQuery && (
                        <button
                            onClick={() => { onTokenQueryChange(''); onTokenSearch(''); }}
                            className={`absolute right-2 top-2.5 ${isJapan ? 'text-[#8D6E63] hover:text-[#D64045]' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Token pills (confirmed tokens) */}
                {enteredTokens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {enteredTokens.map(t => (
                            <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagClasses}`}>
                                {t} ✓
                            </span>
                        ))}
                    </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className={`absolute top-full left-0 w-full mt-1 rounded-lg border max-h-60 overflow-y-auto z-50 ${dropdownClasses}`}>
                        <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b ${isJapan ? 'text-[#8D6E63] border-[#8D6E63]/30 bg-[#E6D7B5]' : isDark ? 'text-gray-500 border-gray-700 bg-gray-900' : 'text-gray-400 border-gray-100 bg-gray-50'}`}>
                            Suggestions — Click or Tab to select
                        </div>
                        {suggestions.map((token, idx) => (
                            <div
                                key={token}
                                className={suggestionItemClasses(idx === activeSuggestionIdx)}
                                onClick={() => handleSelectSuggestion(token)}
                                onMouseEnter={() => setActiveSuggestionIdx(idx)}
                            >
                                <ChevronRight className="w-3 h-3 opacity-40" />
                                <span className="font-mono font-bold">{token}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default AdvancedSearch;
