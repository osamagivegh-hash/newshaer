/**
 * Public API Routes for Family Tree (Persons)
 * These routes are accessible without authentication
 */

const express = require('express');
const mongoose = require('mongoose');
const Person = require('../models/Person');
const treeCache = require('../services/treeCache');

const router = express.Router();

/**
 * @route   GET /api/persons
 * @desc    Get all persons (flat list)
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 100,
            search,
            generation,
            sort = 'generation'
        } = req.query;

        const query = {};

        // Sanitize search input to prevent ReDoS attacks
        if (search) {
            const sanitizedSearch = search.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { fullName: { $regex: sanitizedSearch, $options: 'i' } },
                { nickname: { $regex: sanitizedSearch, $options: 'i' } }
            ];
        }

        if (generation !== undefined) {
            query.generation = parseInt(generation);
        }

        // Limit pagination to prevent abuse
        const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 200);
        const safePage = Math.max(1, parseInt(page) || 1);

        const persons = await Person.find(query)
            .populate('fatherId', 'fullName')
            .sort({ [sort]: 1, siblingOrder: 1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit);

        const total = await Person.countDocuments(query);

        res.json({
            success: true,
            data: persons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('خطأ في جلب الأشخاص:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب البيانات',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/tree
 * @desc    Get full family tree structure (CACHED)
 * @access  Public
 * 
 * Cache Strategy:
 * - Server-side cache with 5-minute TTL
 * - HTTP Cache-Control headers for browser caching
 * - ETag support for conditional GET (304 responses)
 */
router.get('/tree', async (req, res) => {
    try {
        // Check if client has valid cached version (ETag)
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag && treeCache.isClientCacheValid(clientEtag)) {
            // Client cache is still valid, return 304 Not Modified
            return res.status(304).end();
        }

        // Check server-side cache first
        let tree = treeCache.get('fullTree');

        if (!tree) {
            // Cache miss - fetch from database
            tree = await Person.buildTree();

            if (tree) {
                // Store in cache
                treeCache.set('fullTree', tree);
            }
        }

        if (!tree) {
            return res.json({
                success: true,
                data: null,
                message: 'لا توجد شجرة عائلة بعد. يرجى إضافة الجد الأكبر أولاً.'
            });
        }

        // Set cache headers
        const cacheHeaders = treeCache.getCacheHeaders();
        Object.entries(cacheHeaders).forEach(([key, value]) => {
            res.set(key, value);
        });

        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        console.error('خطأ في جلب الشجرة:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب شجرة العائلة',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/tree/:id
 * @desc    Get branch from specific person
 * @access  Public
 */
router.get('/tree/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'معرف غير صالح'
            });
        }

        const branch = await Person.buildTree(id);

        if (!branch) {
            return res.status(404).json({
                success: false,
                error: 'الشخص غير موجود'
            });
        }

        res.json({
            success: true,
            data: branch
        });
    } catch (error) {
        console.error('خطأ في جلب الفرع:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الفرع',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/eligible-fathers
 * @desc    Get eligible fathers for a new person (generation-based filtering)
 * @desc    Supports multi-level branch filtering (main branch, sub-branch, level3, level4)
 * @access  Public
 */
router.get('/eligible-fathers', async (req, res) => {
    try {
        const { generation, excludeId, branch, subBranch, level3Branch, level4Branch } = req.query;

        let query = { gender: 'male' };

        if (generation !== undefined) {
            const targetGen = parseInt(generation);
            if (targetGen > 0) {
                query.generation = targetGen - 1;
            } else {
                return res.json({
                    success: true,
                    data: [],
                    message: 'الجيل الأول لا يحتاج إلى أب'
                });
            }
        }

        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        let eligibleFathers = await Person.find(query)
            .select('_id fullName nickname generation fatherId')
            .populate('fatherId', 'fullName')
            .sort({ generation: 1, fullName: 1 });

        const targetGen = parseInt(generation);

        // Get all persons for ancestry lookup
        const allPersons = await Person.find({}).select('_id fullName fatherId generation').lean();
        const personMap = new Map(allPersons.map(p => [p._id.toString(), p]));

        // Helper to get main branch (generation 1 ancestor)
        const getMainBranch = (personId) => {
            let current = personMap.get(personId?.toString());
            const visited = new Set();

            while (current && current.fatherId && !visited.has(current._id.toString())) {
                visited.add(current._id.toString());
                if (current.generation === 1) {
                    const name = current.fullName || '';
                    if (name.includes('زهار')) return 'zahar';
                    if (name.includes('صالح')) return 'saleh';
                    if (name.includes('براهيم') || name.includes('إبراهيم')) return 'ibrahim';
                    return 'other';
                }
                current = personMap.get(current.fatherId?.toString());
            }
            return null;
        };

        // Helper to get ancestor at specific generation
        const getAncestorAtGeneration = (personId, targetGeneration) => {
            let current = personMap.get(personId?.toString());
            const visited = new Set();

            while (current && !visited.has(current._id.toString())) {
                visited.add(current._id.toString());
                if (current.generation === targetGeneration) {
                    return current._id.toString();
                }
                if (!current.fatherId) break;
                current = personMap.get(current.fatherId?.toString());
            }
            return null;
        };

        // Helper to get ancestor info at specific generation
        const getAncestorInfoAtGeneration = (personId, targetGeneration) => {
            let current = personMap.get(personId?.toString());
            const visited = new Set();

            while (current && !visited.has(current._id.toString())) {
                visited.add(current._id.toString());
                if (current.generation === targetGeneration) {
                    return { id: current._id.toString(), name: current.fullName };
                }
                if (!current.fatherId) break;
                current = personMap.get(current.fatherId?.toString());
            }
            return null;
        };

        // Legacy helpers (kept for backward compatibility)
        const getSubBranch = (personId) => getAncestorAtGeneration(personId, 2);
        const getSubBranchInfo = (personId) => getAncestorInfoAtGeneration(personId, 2);
        const getLevel3Branch = (personId) => getAncestorAtGeneration(personId, 3);
        const getLevel3BranchInfo = (personId) => getAncestorInfoAtGeneration(personId, 3);
        const getLevel4Branch = (personId) => getAncestorAtGeneration(personId, 4);
        const getLevel4BranchInfo = (personId) => getAncestorInfoAtGeneration(personId, 4);

        // Branch filtering for generations 6+
        if (targetGen >= 6) {
            if (branch) {
                eligibleFathers = eligibleFathers.filter(father => {
                    const fatherBranch = getMainBranch(father._id.toString());
                    return fatherBranch === branch;
                });
            }

            // Sub-branch filtering (generation 2)
            if (subBranch) {
                eligibleFathers = eligibleFathers.filter(father => {
                    const fatherSubBranch = getSubBranch(father._id.toString());
                    return fatherSubBranch === subBranch;
                });
            }

            // Level 3 branch filtering (generation 3)
            if (level3Branch) {
                eligibleFathers = eligibleFathers.filter(father => {
                    const fatherLevel3 = getLevel3Branch(father._id.toString());
                    return fatherLevel3 === level3Branch;
                });
            }

            // Level 4 branch filtering (generation 4)
            if (level4Branch) {
                eligibleFathers = eligibleFathers.filter(father => {
                    const fatherLevel4 = getLevel4Branch(father._id.toString());
                    return fatherLevel4 === level4Branch;
                });
            }
        }

        // Get branch and sub-branch counts for UI (only for gen 6+)
        let branchCounts = null;
        let subBranchCounts = null;
        let level3BranchCounts = null;
        let level4BranchCounts = null;

        if (targetGen >= 6) {
            const allFathersForGen = await Person.find({
                gender: 'male',
                generation: targetGen - 1
            }).select('_id fullName fatherId generation').lean();

            branchCounts = { zahar: 0, saleh: 0, ibrahim: 0 };

            // Sub-branch structure (generation 2)
            const subBranchData = {
                zahar: {},
                saleh: {},
                ibrahim: {}
            };

            // Level 3 branch structure (generation 3) - keyed by subBranch id
            const level3BranchData = {};

            // Level 4 branch structure (generation 4) - keyed by level3Branch id
            const level4BranchData = {};

            allFathersForGen.forEach(f => {
                const b = getMainBranch(f._id.toString());
                if (b && branchCounts[b] !== undefined) {
                    branchCounts[b]++;

                    // Count sub-branches for all main branches
                    const subInfo = getSubBranchInfo(f._id.toString());
                    if (subInfo) {
                        if (!subBranchData[b]) subBranchData[b] = {};
                        if (!subBranchData[b][subInfo.id]) {
                            subBranchData[b][subInfo.id] = { name: subInfo.name, count: 0 };
                        }
                        subBranchData[b][subInfo.id].count++;

                        // Count level 3 branches under each sub-branch
                        const level3Info = getLevel3BranchInfo(f._id.toString());
                        if (level3Info) {
                            if (!level3BranchData[subInfo.id]) {
                                level3BranchData[subInfo.id] = {};
                            }
                            if (!level3BranchData[subInfo.id][level3Info.id]) {
                                level3BranchData[subInfo.id][level3Info.id] = { name: level3Info.name, count: 0 };
                            }
                            level3BranchData[subInfo.id][level3Info.id].count++;

                            // Count level 4 branches under each level 3 branch
                            const level4Info = getLevel4BranchInfo(f._id.toString());
                            if (level4Info) {
                                if (!level4BranchData[level3Info.id]) {
                                    level4BranchData[level3Info.id] = {};
                                }
                                if (!level4BranchData[level3Info.id][level4Info.id]) {
                                    level4BranchData[level3Info.id][level4Info.id] = { name: level4Info.name, count: 0 };
                                }
                                level4BranchData[level3Info.id][level4Info.id].count++;
                            }
                        }
                    }
                }
            });

            // Convert sub-branch data to array format
            subBranchCounts = {
                zahar: Object.entries(subBranchData.zahar || {}).map(([id, data]) => ({
                    id,
                    name: data.name,
                    count: data.count
                })),
                saleh: Object.entries(subBranchData.saleh || {}).map(([id, data]) => ({
                    id,
                    name: data.name,
                    count: data.count
                })),
                ibrahim: Object.entries(subBranchData.ibrahim || {}).map(([id, data]) => ({
                    id,
                    name: data.name,
                    count: data.count
                }))
            };

            // Convert level 3 branch data - organized by subBranch id
            level3BranchCounts = {};
            Object.entries(level3BranchData).forEach(([subBranchId, level3Data]) => {
                level3BranchCounts[subBranchId] = Object.entries(level3Data).map(([id, data]) => ({
                    id,
                    name: data.name,
                    count: data.count
                }));
            });

            // Convert level 4 branch data - organized by level3Branch id
            level4BranchCounts = {};
            Object.entries(level4BranchData).forEach(([level3BranchId, level4Data]) => {
                level4BranchCounts[level3BranchId] = Object.entries(level4Data).map(([id, data]) => ({
                    id,
                    name: data.name,
                    count: data.count
                }));
            });
        }

        // Helper function to build 5-part name (person + 4 ancestors)
        const buildFullName5Parts = (personId) => {
            const names = [];
            let current = personMap.get(personId?.toString());
            let count = 0;
            const maxAncestors = 4; // To make it 5 names total
            const visited = new Set();

            if (!current) return '';

            // Add person's first name
            names.push(current.fullName.split(' ')[0]);
            visited.add(current._id.toString());

            // Traverse up to 4 ancestors
            while (current.fatherId && count < maxAncestors && !visited.has(current.fatherId.toString())) {
                visited.add(current.fatherId.toString());
                current = personMap.get(current.fatherId.toString());
                if (current) {
                    names.push(current.fullName.split(' ')[0]);
                    count++;
                } else {
                    break;
                }
            }

            return names.join(' بن ') + ' الشاعر';
        };

        res.json({
            success: true,
            data: eligibleFathers.map(p => ({
                _id: p._id,
                fullName: p.fullName,
                nickname: p.nickname,
                generation: p.generation,
                fatherName: p.fatherId?.fullName || null,
                displayName: buildFullName5Parts(p._id.toString())
            })),
            total: eligibleFathers.length,
            branchCounts,
            subBranchCounts,
            level3BranchCounts,
            level4BranchCounts,
            hasBranchFilter: targetGen >= 6
        });
    } catch (error) {
        console.error('خطأ في جلب الآباء المؤهلين:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الآباء المؤهلين',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/by-generation/:generation
 * @desc    Get all persons from a specific generation
 * @access  Public
 */
router.get('/by-generation/:generation', async (req, res) => {
    try {
        const generation = parseInt(req.params.generation);

        const persons = await Person.find({ generation })
            .select('_id fullName nickname generation fatherId')
            .populate('fatherId', 'fullName')
            .sort({ siblingOrder: 1, fullName: 1 });

        res.json({
            success: true,
            data: persons.map(p => ({
                _id: p._id,
                fullName: p.fullName,
                nickname: p.nickname,
                generation: p.generation,
                fatherName: p.fatherId?.fullName || null,
                displayName: p.fatherId
                    ? `${p.fullName} بن ${p.fatherId.fullName}`
                    : p.fullName
            })),
            generation,
            total: persons.length
        });
    } catch (error) {
        console.error('خطأ في جلب أشخاص الجيل:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب البيانات',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/stats
 * @desc    Get family tree statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
    try {
        const totalPersons = await Person.countDocuments();
        const totalGenerations = await Person.distinct('generation');
        const genderStats = await Person.aggregate([
            { $group: { _id: '$gender', count: { $sum: 1 } } }
        ]);
        const generationStats = await Person.aggregate([
            { $group: { _id: '$generation', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const verificationStats = await Person.aggregate([
            { $group: { _id: '$verification.status', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                totalPersons,
                totalGenerations: totalGenerations.length,
                maxGeneration: Math.max(...totalGenerations, 0),
                genderStats: genderStats.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                generationStats: generationStats.map(item => ({
                    generation: item._id,
                    count: item.count
                })),
                verificationStats: verificationStats.reduce((acc, item) => {
                    acc[item._id || 'pending'] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الإحصائيات',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/:id
 * @desc    Get single person by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'معرف غير صالح'
            });
        }

        const person = await Person.findById(id)
            .populate('fatherId', 'fullName generation')
            .populate('motherId', 'fullName');

        if (!person) {
            return res.status(404).json({
                success: false,
                error: 'الشخص غير موجود'
            });
        }

        // Get children
        const children = await Person.find({ fatherId: id })
            .select('fullName gender generation siblingOrder')
            .sort({ siblingOrder: 1 });

        // Get ancestors
        const ancestors = await Person.getAncestors(id);

        // Get descendants count
        const descendantsCount = await Person.getDescendantsCount(id);

        res.json({
            success: true,
            data: {
                ...person.toObject(),
                children,
                ancestors: ancestors.map(a => ({
                    _id: a._id,
                    fullName: a.fullName,
                    generation: a.generation
                })),
                descendantsCount
            }
        });
    } catch (error) {
        console.error('خطأ في جلب الشخص:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب البيانات',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/:id/ancestors
 * @desc    Get ancestors chain for a person
 * @access  Public
 */
router.get('/:id/ancestors', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'معرف غير صالح'
            });
        }

        const ancestors = await Person.getAncestors(id);

        res.json({
            success: true,
            data: ancestors
        });
    } catch (error) {
        console.error('خطأ في جلب الأسلاف:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الأسلاف',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/persons/:id/siblings
 * @desc    Get siblings of a person
 * @access  Public
 */
router.get('/:id/siblings', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'معرف غير صالح'
            });
        }

        const person = await Person.findById(id);

        if (!person) {
            return res.status(404).json({
                success: false,
                error: 'الشخص غير موجود'
            });
        }

        if (!person.fatherId) {
            return res.json({
                success: true,
                data: [],
                message: 'هذا هو الجد الأكبر، لا يوجد أشقاء'
            });
        }

        const siblings = await Person.find({
            fatherId: person.fatherId,
            _id: { $ne: id }
        }).sort({ siblingOrder: 1 });

        res.json({
            success: true,
            data: siblings
        });
    } catch (error) {
        console.error('خطأ في جلب الأشقاء:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الأشقاء',
            message: error.message
        });
    }
});

module.exports = router;
