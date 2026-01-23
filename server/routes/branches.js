/**
 * Branch-Based API Routes for Scalable Family Tree Loading
 * 
 * These NEW endpoints provide SAFE, SCALABLE access to family tree data
 * by loading branches progressively instead of the full tree at once.
 * 
 * CRITICAL: These are ADDITIVE endpoints. They do NOT replace existing ones.
 * All existing /api/persons/* endpoints remain unchanged.
 */

const express = require('express');
const mongoose = require('mongoose');
const Person = require('../models/Person');

const router = express.Router();

// Constants for safe pagination
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_DEPTH = 10; // Maximum depth for single-request tree building

/**
 * @route   GET /api/branches
 * @desc    Get branch metadata only (lightweight)
 * @access  Public
 * 
 * Returns: Array of { id, name, rootId, memberCount, generation }
 * Purpose: List all available branches without loading member data
 */
router.get('/', async (req, res) => {
    try {
        // Get the root person first
        const root = await Person.findOne({ isRoot: true }).select('_id fullName').lean();

        if (!root) {
            return res.json({
                success: true,
                data: [],
                message: 'No family tree data found'
            });
        }

        // Get main branches (generation 1 - children of root)
        const mainBranches = await Person.find({
            fatherId: root._id,
            generation: 1
        })
            .select('_id fullName nickname generation')
            .lean();

        // Get member count for each branch using aggregation (efficient)
        const branchMetadata = await Promise.all(
            mainBranches.map(async (branch) => {
                // Count all descendants of this branch
                const memberCount = await countDescendants(branch._id);

                // Get direct children count
                const childrenCount = await Person.countDocuments({ fatherId: branch._id });

                return {
                    id: branch._id,
                    name: branch.fullName,
                    nickname: branch.nickname || null,
                    rootId: branch._id,
                    generation: branch.generation,
                    memberCount: memberCount + 1, // Include the branch root itself
                    childrenCount
                };
            })
        );

        res.json({
            success: true,
            data: branchMetadata,
            root: {
                id: root._id,
                name: root.fullName
            },
            total: branchMetadata.length
        });

    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب بيانات الفروع',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/branches/:branchId/members
 * @desc    Get members of ONE branch only (flat records, paginated)
 * @access  Public
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 50, max: 100)
 * - depth: Max depth from branch root (optional, limits tree depth)
 * 
 * Returns flat records: [{ id, name, fatherId, branchId, generation, ... }]
 * NO recursive tree building in memory.
 */
router.get('/:branchId/members', async (req, res) => {
    try {
        const { branchId } = req.params;
        const {
            page = 1,
            limit = DEFAULT_PAGE_SIZE,
            depth
        } = req.query;

        // Validate branchId
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch ID'
            });
        }

        // Get the branch root
        const branchRoot = await Person.findById(branchId)
            .select('_id fullName generation')
            .lean();

        if (!branchRoot) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found'
            });
        }

        // Calculate safe pagination
        const safeLimit = Math.min(Math.max(1, parseInt(limit) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
        const safePage = Math.max(1, parseInt(page) || 1);
        const maxDepth = depth ? Math.min(parseInt(depth), MAX_DEPTH) : null;

        // Get all descendant IDs for this branch (using indexed query)
        // This is done in batches to avoid memory issues
        const allDescendantIds = await getDescendantIdsBatched(branchId, maxDepth, branchRoot.generation);

        // Include the branch root itself
        const allMemberIds = [new mongoose.Types.ObjectId(branchId), ...allDescendantIds];

        // Get total count
        const total = allMemberIds.length;

        // Get paginated members (flat records)
        const paginatedIds = allMemberIds.slice((safePage - 1) * safeLimit, safePage * safeLimit);

        const members = await Person.find({
            _id: { $in: paginatedIds }
        })
            .select('_id fullName nickname generation fatherId gender siblingOrder birthDate deathDate birthPlace currentResidence occupation biography notes isAlive')
            .sort({ generation: 1, siblingOrder: 1 })
            .lean();

        // Add branchId to each member for frontend reference
        const membersWithBranch = members.map(m => ({
            ...m,
            branchId: branchId
        }));

        res.json({
            success: true,
            data: membersWithBranch,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                pages: Math.ceil(total / safeLimit),
                hasMore: safePage * safeLimit < total
            },
            branch: {
                id: branchRoot._id,
                name: branchRoot.fullName,
                generation: branchRoot.generation
            }
        });

    } catch (error) {
        console.error('Error fetching branch members:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب أعضاء الفرع',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/branches/:branchId/tree
 * @desc    Get a shallow tree structure for ONE branch (depth-limited)
 * @access  Public
 * 
 * Query params:
 * - depth: Max depth to include (default: 2, max: 3)
 * 
 * Returns hierarchical tree structure but limited to safe depth
 */
router.get('/:branchId/tree', async (req, res) => {
    try {
        const { branchId } = req.params;
        const { depth = 3 } = req.query;

        // Validate branchId
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch ID'
            });
        }

        const maxDepth = Math.min(Math.max(1, parseInt(depth) || 2), MAX_DEPTH);

        // Build shallow tree with depth limit
        const tree = await buildShallowTree(branchId, maxDepth);

        if (!tree) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found'
            });
        }

        res.json({
            success: true,
            data: tree,
            depth: maxDepth
        });

    } catch (error) {
        console.error('Error fetching branch tree:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب شجرة الفرع',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/branches/:branchId/children
 * @desc    Get direct children of a node (for lazy loading expansion)
 * @access  Public
 * 
 * This is the KEY endpoint for lazy tree expansion.
 * When user expands a node, only its direct children are loaded.
 */
router.get('/:branchId/children', async (req, res) => {
    try {
        const { branchId } = req.params;

        // Validate branchId
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid node ID'
            });
        }

        // Get direct children only
        const children = await Person.find({ fatherId: branchId })
            .select('_id fullName nickname generation gender siblingOrder birthDate deathDate isAlive')
            .sort({ siblingOrder: 1 })
            .lean();

        // Add children count for each child (for expand indicator)
        const childrenWithMeta = await Promise.all(
            children.map(async (child) => {
                const grandchildrenCount = await Person.countDocuments({ fatherId: child._id });
                return {
                    ...child,
                    hasChildren: grandchildrenCount > 0,
                    childrenCount: grandchildrenCount
                };
            })
        );

        res.json({
            success: true,
            data: childrenWithMeta,
            parentId: branchId,
            total: childrenWithMeta.length
        });

    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الأبناء',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/branches/stats
 * @desc    Get overall branch statistics (for Full Tree overview)
 * @access  Public
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Person.aggregate([
            {
                $group: {
                    _id: '$generation',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalMembers = await Person.countDocuments();
        const maxGeneration = stats.length > 0 ? stats[stats.length - 1]._id : 0;

        res.json({
            success: true,
            data: {
                totalMembers,
                maxGeneration,
                generationDistribution: stats.map(s => ({
                    generation: s._id,
                    count: s.count
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الإحصائيات',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/branches/search
 * @desc    Smart search for persons by name chain (person > father > grandfather)
 * @access  Public
 * 
 * Search understands Arabic naming convention:
 * - "محمد عيسى" = Find persons named "محمد" whose father is named "عيسى"
 * - "أسامة محمد موسى" = Find "أسامة" son of "محمد" son of "موسى"
 * 
 * Query params:
 * - q: Search query (required, min 2 characters)
 * - limit: Max results (default: 20, max: 50)
 */
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        // Validate query
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال حرفين على الأقل للبحث'
            });
        }

        const searchQuery = q.trim();
        const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 50);

        // Split the search query into parts (names)
        const nameParts = searchQuery.split(/\s+/).filter(part => part.length > 0);

        const startTime = Date.now();
        console.log('[Search] Query:', searchQuery, '| Parts:', nameParts.length);

        let results = [];

        if (nameParts.length === 1) {
            // Single name: simple search
            results = await Person.find({
                fullName: { $regex: `^${escapeRegex(nameParts[0])}`, $options: 'i' }
            })
                .select('_id fullName nickname generation fatherId birthDate isAlive')
                .sort({ generation: 1 })
                .limit(safeLimit)
                .lean();

        } else if (nameParts.length === 2) {
            // Two names: person + father - Use aggregation with single $lookup
            const [personName, fatherName] = nameParts;

            results = await Person.aggregate([
                // Match persons by first name
                { $match: { fullName: { $regex: `^${escapeRegex(personName)}`, $options: 'i' } } },
                // Join with father
                {
                    $lookup: {
                        from: 'persons',
                        localField: 'fatherId',
                        foreignField: '_id',
                        as: 'father'
                    }
                },
                { $unwind: { path: '$father', preserveNullAndEmptyArrays: false } },
                // Filter by father's name
                { $match: { 'father.fullName': { $regex: `^${escapeRegex(fatherName)}`, $options: 'i' } } },
                // Project needed fields
                {
                    $project: {
                        _id: 1,
                        fullName: 1,
                        nickname: 1,
                        generation: 1,
                        fatherId: 1,
                        birthDate: 1,
                        isAlive: 1,
                        fatherName: '$father.fullName'
                    }
                },
                { $sort: { generation: 1 } },
                { $limit: safeLimit }
            ]);

        } else if (nameParts.length >= 3) {
            // Three+ names: person + father + grandfather - Use double $lookup
            const [personName, fatherName, grandfatherName] = nameParts;

            results = await Person.aggregate([
                // Match persons by first name
                { $match: { fullName: { $regex: `^${escapeRegex(personName)}`, $options: 'i' } } },
                // Join with father
                {
                    $lookup: {
                        from: 'persons',
                        localField: 'fatherId',
                        foreignField: '_id',
                        as: 'father'
                    }
                },
                { $unwind: { path: '$father', preserveNullAndEmptyArrays: false } },
                // Filter by father's name
                { $match: { 'father.fullName': { $regex: `^${escapeRegex(fatherName)}`, $options: 'i' } } },
                // Join with grandfather
                {
                    $lookup: {
                        from: 'persons',
                        localField: 'father.fatherId',
                        foreignField: '_id',
                        as: 'grandfather'
                    }
                },
                { $unwind: { path: '$grandfather', preserveNullAndEmptyArrays: false } },
                // Filter by grandfather's name
                { $match: { 'grandfather.fullName': { $regex: `^${escapeRegex(grandfatherName)}`, $options: 'i' } } },
                // If 4+ names, we need to check more ancestors (use slower method for remaining)
                // Project needed fields
                {
                    $project: {
                        _id: 1,
                        fullName: 1,
                        nickname: 1,
                        generation: 1,
                        fatherId: 1,
                        birthDate: 1,
                        isAlive: 1,
                        fatherName: '$father.fullName',
                        grandfatherName: '$grandfather.fullName'
                    }
                },
                { $sort: { generation: 1 } },
                { $limit: safeLimit * 2 }
            ]);

            // If 4+ names, filter further
            if (nameParts.length > 3) {
                const additionalNames = nameParts.slice(3);
                const filteredResults = [];
                for (const person of results) {
                    const isMatch = await checkAncestryChainFromGrandfather(person.fatherId, additionalNames);
                    if (isMatch) {
                        filteredResults.push(person);
                        if (filteredResults.length >= safeLimit) break;
                    }
                }
                results = filteredResults;
            }
        }

        // Limit results
        results = results.slice(0, safeLimit);

        const searchTime = Date.now() - startTime;
        console.log('[Search] Found', results.length, 'results in', searchTime, 'ms');

        // Get ancestors path for each result (in parallel)
        const resultsWithPath = await Promise.all(
            results.map(async (person) => {
                const ancestors = await getAncestorsPath(person._id);
                return {
                    _id: person._id,
                    fullName: person.fullName,
                    nickname: person.nickname,
                    generation: person.generation,
                    fatherId: person.fatherId,
                    birthDate: person.birthDate,
                    isAlive: person.isAlive,
                    ancestorsPath: ancestors.map(a => a.fullName.split(' ')[0]).join(' > '),
                    ancestorIds: ancestors.map(a => a._id)
                };
            })
        );

        res.json({
            success: true,
            data: resultsWithPath,
            query: searchQuery,
            total: resultsWithPath.length,
            searchType: nameParts.length > 1 ? 'lineage' : 'simple',
            searchTimeMs: searchTime
        });

    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في البحث',
            message: error.message
        });
    }
});

/**
 * Check if a person's ancestry chain matches the given name parts
 * @param {Object} person - The person to check
 * @param {Array} namePartsToMatch - Array of ancestor names to match [father, grandfather, ...]
 * @returns {boolean} - True if all ancestors match
 */
async function checkAncestryChain(person, namePartsToMatch) {
    if (namePartsToMatch.length === 0) return true;

    let currentId = person.fatherId;

    for (const expectedName of namePartsToMatch) {
        if (!currentId) return false;

        const ancestor = await Person.findById(currentId)
            .select('fullName fatherId')
            .lean();

        if (!ancestor) return false;

        // Check if ancestor's first name matches
        const ancestorFirstName = ancestor.fullName.split(' ')[0];
        if (!ancestorFirstName.toLowerCase().startsWith(expectedName.toLowerCase())) {
            return false;
        }

        currentId = ancestor.fatherId;
    }

    return true;
}

/**
 * Check ancestry chain starting from a given ancestor ID (for 4+ name searches)
 * @param {ObjectId} fatherId - Start checking from this person's father
 * @param {Array} namePartsToMatch - Names to match starting from great-grandfather
 * @returns {boolean}
 */
async function checkAncestryChainFromGrandfather(fatherId, namePartsToMatch) {
    if (namePartsToMatch.length === 0) return true;
    if (!fatherId) return false;

    // First get the grandfather
    const father = await Person.findById(fatherId).select('fatherId').lean();
    if (!father || !father.fatherId) return false;

    // Now check from grandfather onwards
    let currentId = father.fatherId;

    for (const expectedName of namePartsToMatch) {
        if (!currentId) return false;

        const ancestor = await Person.findById(currentId)
            .select('fullName fatherId')
            .lean();

        if (!ancestor) return false;

        const ancestorFirstName = ancestor.fullName.split(' ')[0];
        if (!ancestorFirstName.toLowerCase().startsWith(expectedName.toLowerCase())) {
            return false;
        }

        currentId = ancestor.fatherId;
    }

    return true;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @route   GET /api/branches/lineage/:personId
 * @desc    Get full lineage of a person (from person to root)
 * @access  Public
 */
router.get('/lineage/:personId', async (req, res) => {
    try {
        const { personId } = req.params;

        // Validate personId
        if (!mongoose.Types.ObjectId.isValid(personId)) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشخص غير صالح'
            });
        }

        // Get the person
        const person = await Person.findById(personId)
            .select('_id fullName nickname generation fatherId birthDate deathDate isAlive occupation')
            .lean();

        if (!person) {
            return res.status(404).json({
                success: false,
                error: 'الشخص غير موجود'
            });
        }

        // Build lineage from person to root
        const lineage = [person];
        let currentId = person.fatherId;
        const visited = new Set([personId.toString()]);

        while (currentId && !visited.has(currentId.toString())) {
            visited.add(currentId.toString());
            const ancestor = await Person.findById(currentId)
                .select('_id fullName nickname generation fatherId birthDate deathDate isAlive occupation')
                .lean();

            if (!ancestor) break;

            lineage.push(ancestor);
            currentId = ancestor.fatherId;
        }

        res.json({
            success: true,
            person,
            lineage,
            totalGenerations: lineage.length
        });

    } catch (error) {
        console.error('Error fetching lineage:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب النسب',
            message: error.message
        });
    }
});

/**
 * Get ancestors path for a person (from root to parent)
 */
async function getAncestorsPath(personId) {
    const ancestors = [];
    let currentId = personId;
    const visited = new Set();

    // First get the person to find their father
    const person = await Person.findById(currentId).select('fatherId').lean();
    if (!person || !person.fatherId) return ancestors;

    currentId = person.fatherId;

    while (currentId && !visited.has(currentId.toString())) {
        visited.add(currentId.toString());
        const ancestor = await Person.findById(currentId)
            .select('_id fullName fatherId')
            .lean();

        if (!ancestor) break;

        ancestors.unshift(ancestor); // Add to beginning
        currentId = ancestor.fatherId;
    }

    return ancestors;
}

// ============ HELPER FUNCTIONS ============

/**
 * Count all descendants of a person (recursive but using indexed queries)
 */
async function countDescendants(personId) {
    let count = 0;
    const queue = [personId];
    const visited = new Set();

    while (queue.length > 0) {
        const batchSize = Math.min(queue.length, 100);
        const batch = queue.splice(0, batchSize);

        // Filter out already visited IDs
        const toProcess = batch.filter(id => !visited.has(id.toString()));
        if (toProcess.length === 0) continue;

        toProcess.forEach(id => visited.add(id.toString()));

        const children = await Person.find({
            fatherId: { $in: toProcess }
        })
            .select('_id')
            .lean();

        count += children.length;
        children.forEach(child => {
            if (!visited.has(child._id.toString())) {
                queue.push(child._id);
            }
        });
    }

    return count;
}

/**
 * Get all descendant IDs in batches (memory-efficient)
 */
async function getDescendantIdsBatched(rootId, maxDepth = null, rootGeneration = 0) {
    const allIds = [];
    let currentLevel = [new mongoose.Types.ObjectId(rootId)];
    let currentDepth = 0;
    const visited = new Set([rootId.toString()]);

    while (currentLevel.length > 0) {
        currentDepth++;

        // Check depth limit
        if (maxDepth !== null && currentDepth > maxDepth) {
            break;
        }

        // Get children in batches
        const nextLevel = [];
        const batchSize = 100;

        for (let i = 0; i < currentLevel.length; i += batchSize) {
            const batch = currentLevel.slice(i, i + batchSize);
            const children = await Person.find({
                fatherId: { $in: batch }
            })
                .select('_id')
                .lean();

            children.forEach(child => {
                if (!visited.has(child._id.toString())) {
                    visited.add(child._id.toString());
                    allIds.push(child._id);
                    nextLevel.push(child._id);
                }
            });
        }

        currentLevel = nextLevel;
    }

    return allIds;
}

/**
 * Build a shallow tree with depth limit (safe for rendering)
 */
async function buildShallowTree(rootId, maxDepth, currentDepth = 0) {
    const node = await Person.findById(rootId)
        .select('_id fullName nickname generation gender siblingOrder birthDate deathDate birthPlace currentResidence occupation biography notes isAlive fatherId')
        .lean();

    if (!node) return null;

    // Add children count
    const childrenCount = await Person.countDocuments({ fatherId: node._id });
    node.childrenCount = childrenCount;
    node.hasChildren = childrenCount > 0;

    // If we haven't reached max depth and node has children, fetch them
    if (currentDepth < maxDepth && childrenCount > 0) {
        const children = await Person.find({ fatherId: node._id })
            .select('_id fullName nickname generation gender siblingOrder birthDate deathDate birthPlace currentResidence occupation biography notes isAlive fatherId')
            .sort({ siblingOrder: 1 })
            .lean();

        // Recursively build children trees
        node.children = await Promise.all(
            children.map(child => buildShallowTree(child._id, maxDepth, currentDepth + 1))
        );
    } else {
        node.children = [];
        node.isLazyLoadable = childrenCount > 0; // Mark for lazy loading
    }

    return node;
}

module.exports = router;
