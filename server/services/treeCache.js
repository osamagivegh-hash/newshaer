/**
 * Family Tree Cache Service
 * In-memory cache with TTL for fast tree data retrieval
 */

class TreeCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.lastModified = new Date();
        this.etag = this.generateEtag();
    }

    /**
     * Generate a unique ETag based on timestamp
     */
    generateEtag() {
        return `"tree-${Date.now()}-${Math.random().toString(36).substring(7)}"`;
    }

    /**
     * Get cached tree data
     * @param {string} key - Cache key (default: 'fullTree')
     * @returns {object|null} - Cached data or null if expired/not found
     */
    get(key = 'fullTree') {
        const cached = this.cache.get(key);

        if (!cached) {
            console.log(`[TreeCache] Cache MISS for key: ${key}`);
            return null;
        }

        // Check if expired
        if (Date.now() > cached.expiresAt) {
            console.log(`[TreeCache] Cache EXPIRED for key: ${key}`);
            this.cache.delete(key);
            return null;
        }

        console.log(`[TreeCache] Cache HIT for key: ${key}`);
        return cached.data;
    }

    /**
     * Set cache data
     * @param {string} key - Cache key
     * @param {object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key = 'fullTree', data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
            createdAt: new Date()
        });
        console.log(`[TreeCache] Cached data for key: ${key}, TTL: ${ttl / 1000}s`);
    }

    /**
     * Invalidate all cache (call when tree data changes)
     */
    invalidate() {
        const size = this.cache.size;
        this.cache.clear();
        this.lastModified = new Date();
        this.etag = this.generateEtag();
        console.log(`[TreeCache] Cache INVALIDATED - cleared ${size} entries, new ETag: ${this.etag}`);
    }

    /**
     * Invalidate specific key
     * @param {string} key - Cache key to invalidate
     */
    invalidateKey(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.lastModified = new Date();
            this.etag = this.generateEtag();
            console.log(`[TreeCache] Key INVALIDATED: ${key}`);
        }
    }

    /**
     * Get cache headers for HTTP response
     * @returns {object} - Headers object
     */
    getCacheHeaders() {
        return {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
            'ETag': this.etag,
            'Last-Modified': this.lastModified.toUTCString(),
            'X-Cache-Status': this.cache.has('fullTree') ? 'HIT' : 'MISS'
        };
    }

    /**
     * Check if client cache is still valid (for conditional GET)
     * @param {string} clientEtag - ETag from client request
     * @returns {boolean} - True if cache is still valid
     */
    isClientCacheValid(clientEtag) {
        return clientEtag === this.etag;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            entries: this.cache.size,
            lastModified: this.lastModified,
            etag: this.etag,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Pre-warm the cache by loading tree data on server startup
     * This ensures the first visitor gets instant response
     */
    async warmUp() {
        try {
            console.log('[TreeCache] 🔥 Starting cache pre-warming...');
            const startTime = Date.now();

            // Import Person model here to avoid circular dependency
            const Person = require('../models/Person');

            // Build the full tree and cache it
            const tree = await Person.buildTree();

            if (tree) {
                this.set('fullTree', tree);
                const duration = Date.now() - startTime;
                console.log(`[TreeCache] ✅ Cache pre-warmed successfully in ${duration}ms`);
                console.log(`[TreeCache] 📊 Tree cached with ${this.countNodes(tree)} nodes`);
                return { success: true, duration, nodeCount: this.countNodes(tree) };
            } else {
                console.log('[TreeCache] ⚠️ No tree data found to pre-warm');
                return { success: false, reason: 'No tree data' };
            }
        } catch (error) {
            console.error('[TreeCache] ❌ Cache pre-warming failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Count total nodes in tree (for logging)
     */
    countNodes(node) {
        if (!node) return 0;
        let count = 1;
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                count += this.countNodes(child);
            }
        }
        return count;
    }
}

// Singleton instance
const treeCache = new TreeCache();

module.exports = treeCache;
