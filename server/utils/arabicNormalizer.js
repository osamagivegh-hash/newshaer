/**
 * Arabic Text Normalizer for Family Tree Search
 * 
 * Handles common Arabic text variations to improve search accuracy:
 * 1. Alef variations: أ إ آ ا - all treated as equivalent
 * 2. Taa Marbuta vs Haa: ة ه - treated as equivalent
 * 3. Yaa vs Alef Maqsura: ي ى - treated as equivalent
 * 4. Remove diacritics (tashkeel)
 */

/**
 * Normalize Arabic text for search purposes
 * Converts all Alef variations to plain Alef, Taa Marbuta to Haa, etc.
 * 
 * @param {string} text - Input Arabic text
 * @returns {string} - Normalized text
 */
function normalizeArabic(text) {
    if (!text || typeof text !== 'string') return '';

    return text
        // Remove diacritics (tashkeel): fatha, damma, kasra, sukun, shadda, etc.
        .replace(/[\u064B-\u065F\u0670]/g, '')

        // Normalize Alef variations to plain Alef (ا)
        // أ (Alef with Hamza above) -> ا
        // إ (Alef with Hamza below) -> ا
        // آ (Alef with Madda) -> ا
        // ٱ (Alef Wasla) -> ا
        .replace(/[أإآٱ]/g, 'ا')

        // Normalize Taa Marbuta (ة) to Haa (ه)
        .replace(/ة/g, 'ه')

        // Normalize Alef Maqsura (ى) to Yaa (ي)
        .replace(/ى/g, 'ي')

        // Trim extra spaces
        .trim();
}

/**
 * Create a regex pattern that matches all variations of the Arabic text
 * This is used for MongoDB regex search
 * 
 * @param {string} text - Input search text
 * @returns {string} - Regex pattern string
 */
function createArabicSearchPattern(text) {
    if (!text || typeof text !== 'string') return '';

    // First normalize the search term
    let pattern = normalizeArabic(text);

    // Escape regex special characters
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace plain Alef with pattern matching all Alef variations
    pattern = pattern.replace(/ا/g, '[اأإآٱ]');

    // Replace Haa with pattern matching both Taa Marbuta and Haa
    pattern = pattern.replace(/ه/g, '[هة]');

    // Replace Yaa with pattern matching both Yaa and Alef Maqsura
    pattern = pattern.replace(/ي/g, '[يى]');

    return pattern;
}

/**
 * Build full lineage string with "الشاعر" suffix
 * Always appends "الشاعر" at the end of the lineage
 * 
 * @param {Array} ancestors - Array of ancestor objects in order [person, father, grandfather, ...]
 * @param {string} separator - Separator between names (default: ' بن ')
 * @returns {string} - Full lineage string ending with "الشاعر"
 */
function buildFullLineage(ancestors, separator = ' بن ') {
    if (!ancestors || !Array.isArray(ancestors) || ancestors.length === 0) {
        return '';
    }

    // Get first names only
    const names = ancestors.map(a => {
        if (typeof a === 'string') return a.split(' ')[0];
        if (a && a.fullName) return a.fullName.split(' ')[0];
        return '';
    }).filter(n => n);

    if (names.length === 0) return '';

    // Build lineage string
    let lineage = names.join(separator);

    // Always add "الشاعر" at the end if not already there
    // "الشاعر" is a description for "محمد" - the ancestor
    if (!lineage.endsWith('الشاعر')) {
        lineage += ' الشاعر';
    }

    return lineage;
}

/**
 * Format ancestors path for display with "الشاعر" suffix
 * 
 * @param {Array} ancestors - Array of ancestor objects
 * @param {string} pathSeparator - Separator for path display (default: ' > ')
 * @returns {string} - Formatted path ending with "الشاعر"
 */
function formatAncestorsPath(ancestors, pathSeparator = ' > ') {
    if (!ancestors || !Array.isArray(ancestors) || ancestors.length === 0) {
        return 'الشاعر';
    }

    const names = ancestors.map(a => {
        if (typeof a === 'string') return a;
        if (a && a.fullName) return a.fullName.split(' ')[0];
        return '';
    }).filter(n => n);

    if (names.length === 0) return 'الشاعر';

    let path = names.join(pathSeparator);

    // Ensure it ends with الشاعر
    if (!path.endsWith('الشاعر')) {
        path += pathSeparator + 'الشاعر';
    }

    return path;
}

/**
 * Normalize search query for comparison
 * Used when comparing search results
 * 
 * @param {string} query - Search query
 * @returns {string} - Normalized query
 */
function normalizeSearchQuery(query) {
    if (!query || typeof query !== 'string') return '';
    return normalizeArabic(query).toLowerCase();
}

/**
 * Check if two Arabic strings match (ignoring variations)
 * 
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - True if they match after normalization
 */
function arabicMatch(str1, str2) {
    return normalizeSearchQuery(str1) === normalizeSearchQuery(str2);
}

/**
 * Check if str1 starts with str2 (ignoring Arabic variations)
 * 
 * @param {string} str1 - String to check
 * @param {string} prefix - Prefix to look for
 * @returns {boolean} - True if str1 starts with prefix after normalization
 */
function arabicStartsWith(str1, prefix) {
    const normalized1 = normalizeSearchQuery(str1);
    const normalized2 = normalizeSearchQuery(prefix);
    return normalized1.startsWith(normalized2);
}

module.exports = {
    normalizeArabic,
    createArabicSearchPattern,
    buildFullLineage,
    formatAncestorsPath,
    normalizeSearchQuery,
    arabicMatch,
    arabicStartsWith
};
