/**
 * Family Tree Client-Side Cache Utility
 * Uses localStorage for persistent caching with TTL and version tracking
 */

const CACHE_KEY = 'familyTreeData_v3';
const CACHE_VERSION_KEY = 'familyTreeVersion';
const CACHE_TIMESTAMP_KEY = 'familyTreeTimestamp';
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get cached family tree data
 * @returns {object|null} - Cached data or null if expired/not found
 */
export const getCachedTree = () => {
    try {
        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        // Check if cache exists and is not expired
        if (!timestamp) {
            console.log('[TreeCache Client] No cache found');
            return null;
        }

        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge > DEFAULT_TTL) {
            console.log('[TreeCache Client] Cache expired');
            clearTreeCache();
            return null;
        }

        const cachedData = localStorage.getItem(CACHE_KEY);
        if (!cachedData) {
            return null;
        }

        console.log('[TreeCache Client] Cache HIT, age:', Math.round(cacheAge / 1000), 'seconds');
        return JSON.parse(cachedData);
    } catch (error) {
        console.error('[TreeCache Client] Error reading cache:', error);
        return null;
    }
};

/**
 * Save family tree data to cache
 * @param {object} data - Tree data to cache
 * @param {string} etag - ETag from server response
 */
export const setCachedTree = (data, etag = null) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        if (etag) {
            localStorage.setItem(CACHE_VERSION_KEY, etag);
        }
        console.log('[TreeCache Client] Data cached successfully');
    } catch (error) {
        console.error('[TreeCache Client] Error saving cache:', error);
        // If localStorage is full, clear old cache and try again
        if (error.name === 'QuotaExceededError') {
            clearTreeCache();
        }
    }
};

/**
 * Clear the family tree cache
 */
export const clearTreeCache = () => {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
        console.log('[TreeCache Client] Cache cleared');
    } catch (error) {
        console.error('[TreeCache Client] Error clearing cache:', error);
    }
};

/**
 * Get the cached ETag for conditional requests
 * @returns {string|null}
 */
export const getCachedEtag = () => {
    return localStorage.getItem(CACHE_VERSION_KEY);
};

/**
 * Check if cache is still valid
 * @returns {boolean}
 */
export const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    return (Date.now() - parseInt(timestamp)) < DEFAULT_TTL;
};

/**
 * Fetch tree data with caching support
 * @param {string} apiUrl - Base API URL
 * @param {boolean} forceRefresh - Force fetch from server
 * @returns {Promise<object>} - Tree data
 */
export const fetchTreeWithCache = async (apiUrl, forceRefresh = false) => {
    // Check client cache first (unless forced refresh)
    if (!forceRefresh) {
        const cachedData = getCachedTree();
        if (cachedData) {
            return { data: cachedData, fromCache: true };
        }
    }

    // Fetch from server
    const headers = {};
    const cachedEtag = getCachedEtag();
    if (cachedEtag && !forceRefresh) {
        headers['If-None-Match'] = cachedEtag;
    }

    const response = await fetch(`${apiUrl}/api/persons/tree`, { headers });

    // Server returned 304 - use cached data
    if (response.status === 304) {
        const cachedData = getCachedTree();
        if (cachedData) {
            // Refresh the timestamp since server confirmed data is still valid
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            return { data: cachedData, fromCache: true };
        }
    }

    // Parse new data
    const result = await response.json();

    if (result.success && result.data) {
        // Cache the new data
        const etag = response.headers.get('ETag');
        setCachedTree(result.data, etag);
        return { data: result.data, fromCache: false };
    }

    throw new Error(result.message || 'Failed to fetch tree data');
};

export default {
    getCachedTree,
    setCachedTree,
    clearTreeCache,
    getCachedEtag,
    isCacheValid,
    fetchTreeWithCache
};
