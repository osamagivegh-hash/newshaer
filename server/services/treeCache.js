/**
 * Family Tree Cache Service (Memory-Optimized)
 * 
 * MEMORY OPTIMIZATION STRATEGY:
 * 1. Store only essential fields per node (not full person data)
 * 2. Use lazy loading - don't build full tree on startup
 * 3. Implement cache size limits
 * 4. Add garbage collection hints after large operations
 */

class TreeCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.lastModified = new Date();
        this.etag = this.generateEtag();

        // Memory optimization settings
        this.maxCacheSize = 5; // Maximum number of cached items
        this.enableMemoryOptimization = true;
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
     * Set cache data with memory-efficient storage
     * @param {string} key - Cache key
     * @param {object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key = 'fullTree', data, ttl = this.defaultTTL) {
        // Enforce cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            console.log(`[TreeCache] Evicted oldest cache entry: ${oldestKey}`);
        }

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

        // Hint garbage collector after clearing large cache
        if (global.gc) {
            global.gc();
            console.log('[TreeCache] Garbage collection triggered');
        }
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
        const memUsage = process.memoryUsage();
        return {
            entries: this.cache.size,
            lastModified: this.lastModified,
            etag: this.etag,
            keys: Array.from(this.cache.keys()),
            memoryMB: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024)
            }
        };
    }

    /**
     * Build a memory-efficient tree structure
     * Only includes essential fields needed for tree visualization + PersonModal
     */
    buildLightweightTree(allPersons) {
        if (!allPersons || allPersons.length === 0) return null;

        // Essential fields for tree visualization + PersonModal display
        // Removed only: contact, verification, profileImage (rarely used), timestamps
        const essentialFields = [
            '_id', 'fullName', 'nickname', 'fatherId', 'generation',
            'gender', 'isAlive', 'showStatus', 'isRoot', 'siblingOrder', 'birthDate', 'deathDate',
            // Additional fields for PersonModal
            'birthPlace', 'currentResidence', 'occupation', 'biography', 'notes'
        ];

        // Create a map with only essential data
        const personMap = new Map();
        allPersons.forEach(person => {
            const lightPerson = {};
            essentialFields.forEach(field => {
                if (person[field] !== undefined) {
                    lightPerson[field] = person[field];
                }
            });
            lightPerson.children = [];
            personMap.set(person._id.toString(), lightPerson);
        });

        // Build parent-child relationships
        let root = null;
        allPersons.forEach(person => {
            const node = personMap.get(person._id.toString());

            if (person.fatherId) {
                const parent = personMap.get(person.fatherId.toString());
                if (parent) {
                    parent.children.push(node);
                    node.fatherName = parent.fullName;
                    node._tempFatherNode = parent;
                }
            }

            if (person.isRoot || (!person.fatherId && !root)) {
                root = node;
            }
        });

        // Second pass: compute fullLineageName for ALL nodes first
        allPersons.forEach(person => {
            const node = personMap.get(person._id.toString());
            let current = node;
            let lineageArray = [];
            while (current) {
                lineageArray.push(current.fullName);
                current = current._tempFatherNode;
            }
            node.fullLineageName = lineageArray.join(' بن ');
        });

        // Third pass: clean up temp references (must be separate to avoid breaking chains)
        allPersons.forEach(person => {
            const node = personMap.get(person._id.toString());
            delete node._tempFatherNode;
        });

        // Sort children by siblingOrder
        const sortChildren = (node) => {
            if (node.children && node.children.length > 0) {
                node.children.sort((a, b) => (a.siblingOrder || 0) - (b.siblingOrder || 0));
                node.children.forEach(sortChildren);
            }
        };

        if (root) {
            sortChildren(root);
        }

        return root;
    }

    /**
     * Pre-warm the cache by loading tree data on server startup
     * MEMORY OPTIMIZED: Uses lightweight tree structure
     */
    async warmUp() {
        try {
            console.log('[TreeCache] 🔥 Starting memory-efficient cache pre-warming (v3)...');
            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;

            // Import Person model here to avoid circular dependency
            const Person = require('../models/Person');

            // Fetch essential fields + PersonModal fields from database
            const allPersons = await Person.find({}).select(
                '_id fullName nickname fatherId generation gender isAlive showStatus isRoot siblingOrder birthDate deathDate birthPlace currentResidence occupation biography notes'
            ).lean();

            if (allPersons.length === 0) {
                console.log('[TreeCache] ⚠️ No tree data found to pre-warm');
                return { success: false, reason: 'No tree data' };
            }

            // Build lightweight tree
            const tree = this.buildLightweightTree(allPersons);

            if (tree) {
                this.set('fullTree', tree);
                const duration = Date.now() - startTime;
                const endMemory = process.memoryUsage().heapUsed;
                const memoryUsedMB = Math.round((endMemory - startMemory) / 1024 / 1024);

                console.log(`[TreeCache] ✅ Cache pre-warmed successfully in ${duration}ms`);
                console.log(`[TreeCache] 📊 Tree cached with ${this.countNodes(tree)} nodes`);
                console.log(`[TreeCache] 💾 Memory used for cache: ~${memoryUsedMB}MB`);

                return {
                    success: true,
                    duration,
                    nodeCount: this.countNodes(tree),
                    memoryUsedMB
                };
            }

            return { success: false, reason: 'Failed to build tree' };
        } catch (error) {
            console.error('[TreeCache] ❌ Cache pre-warming failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get full person details (for modal/detail view)
     * This fetches from DB on-demand instead of caching everything
     */
    async getPersonDetails(personId) {
        try {
            const Person = require('../models/Person');
            const person = await Person.findById(personId).lean();
            return person;
        } catch (error) {
            console.error(`[TreeCache] Error fetching person ${personId}:`, error.message);
            return null;
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
