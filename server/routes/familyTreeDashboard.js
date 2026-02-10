/**
 * Family Tree Dashboard Routes (ISOLATED)
 * 
 * COMPLETELY SEPARATE from CMS Dashboard routes.
 * Uses its own authentication system:
 * - FamilyTreeAdmin model
 * - Separate JWT secret (FAMILY_TREE_JWT_SECRET)
 * - Own permission checks
 * 
 * SECURITY: This router REJECTS any CMS tokens.
 * CMS admins CANNOT access these endpoints.
 */

const express = require('express');
const router = express.Router();
const {
    authenticateFTToken,
    requireFTSuperAdmin,
    requireFTPermission
} = require('../middleware/familyTreeAuth');
const { Person, Backup, BackupSettings, AuditLog } = require('../models');
const BackupService = require('../services/BackupService');
const treeCache = require('../services/treeCache');

// Helper to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';
};

// ==================== DASHBOARD STATS ====================

/**
 * Get Family Tree Dashboard statistics
 * Requires: Family Tree authentication
 */
router.get('/stats', authenticateFTToken, async (req, res) => {
    try {
        const totalPersons = await Person.countDocuments();
        const totalGenerations = await Person.distinct('generation').then(gens => gens.length);
        const rootAncestors = await Person.countDocuments({ isRoot: true });
        const livingMembers = await Person.countDocuments({ isAlive: true });
        const deceasedMembers = await Person.countDocuments({ isAlive: false });

        // Get latest backup info
        const latestBackup = await Backup.getLatestBackup('family-tree');
        const totalBackups = await Backup.getBackupCount('family-tree');

        // Get generation breakdown
        const generationBreakdown = await Person.aggregate([
            { $group: { _id: '$generation', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Get max generation (for dropdown auto-extend)
        const maxGenDoc = await Person.findOne().sort({ generation: -1 }).select('generation');
        const maxGeneration = maxGenDoc ? maxGenDoc.generation : 0;

        res.json({
            success: true,
            data: {
                totalPersons,
                totalGenerations,
                maxGeneration,
                rootAncestors,
                livingMembers,
                deceasedMembers,
                generationBreakdown: generationBreakdown.map(g => ({
                    generation: g._id,
                    count: g.count
                })),
                backup: {
                    totalBackups,
                    lastBackup: latestBackup ? {
                        backupId: latestBackup.backupId,
                        createdAt: latestBackup.createdAt,
                        triggerType: latestBackup.triggerType,
                        stats: latestBackup.stats
                    } : null
                }
            }
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Stats error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات شجرة العائلة' });
    }
});

/**
 * Get latest 50 additions to the family tree
 * Shows full lineage for each person
 */
router.get('/latest-additions', authenticateFTToken, async (req, res) => {
    try {
        const { buildFullLineage } = require('../utils/arabicNormalizer');

        // Fetch last 50 persons sorted by creation date (newest first)
        const latestPersons = await Person.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .select('fullName fatherId createdBy createdAt updatedAt')
            .lean();

        // Build rich payload with full lineage
        const results = await Promise.all(latestPersons.map(async (person) => {
            // Get ancestors chain for full name construction
            const ancestors = await Person.getAncestors(person._id);

            // Combine person + ancestors for full lineage
            const fullLineageChain = [person, ...ancestors];

            // Build full name string (adds 'Al-Shaer' automatically)
            let fullName = '';
            try {
                fullName = buildFullLineage(fullLineageChain, ' بن ');
            } catch (e) {
                fullName = fullLineageChain.map(p => p.fullName.split(' ')[0]).join(' بن ') + ' الشاعر';
            }

            return {
                id: person._id,
                shortName: person.fullName,
                fullName: fullName,
                createdBy: person.createdBy || 'System',
                createdAt: person.createdAt,
                updatedAt: person.updatedAt
            };
        }));

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Latest additions error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب آخر الإضافات' });
    }
});

// ==================== PERSON MANAGEMENT ====================

/**
 * Get all persons
 */
router.get('/persons', authenticateFTToken, requireFTPermission('manage-members'), async (req, res) => {
    try {
        const { search, generation } = req.query;
        let query = {};

        // Handle Generation Filter
        if (generation && generation !== '0' && generation !== '') {
            query.generation = parseInt(generation);
        }

        // 1. No Search - Standard List
        if (!search || !search.trim()) {
            const persons = await Person.find(query)
                .populate('fatherId', 'fullName generation fatherId')
                .sort({ generation: 1, order: 1 })
                .lean();

            // Build displayName for each father
            const personsWithDisplayNames = await Promise.all(persons.map(async (person) => {
                if (person.fatherId) {
                    const displayName = await buildFatherFullName(person.fatherId);
                    return {
                        ...person,
                        fatherId: {
                            ...person.fatherId,
                            displayName
                        }
                    };
                }
                return person;
            }));

            return res.json({
                success: true,
                data: personsWithDisplayNames
            });
        }

        // 2. Search Logic
        const searchQuery = search.trim();
        const nameParts = searchQuery.split(/\s+/).filter(part => part.length > 0);
        let results = [];

        if (nameParts.length === 1) {
            // Single name search
            query.fullName = { $regex: new RegExp(escapeRegex(nameParts[0]), 'i') };
            results = await Person.find(query)
                .populate('fatherId', 'fullName generation fatherId')
                .sort({ generation: 1, order: 1 })
                .lean();

            // Build displayName for each father
            results = await Promise.all(results.map(async (person) => {
                if (person.fatherId) {
                    const displayName = await buildFatherFullName(person.fatherId);
                    return {
                        ...person,
                        fatherId: {
                            ...person.fatherId,
                            displayName
                        }
                    };
                }
                return person;
            }));
        } else {
            // Multi-part name search (Person > Father > Grandfather)
            // Use aggregation to match the chain
            const pipeline = [];

            // 1. Match Person Name
            pipeline.push({
                $match: {
                    fullName: { $regex: `^${escapeRegex(nameParts[0])}`, $options: 'i' },
                    ...query // Apply generation filter if enabled
                }
            });

            // 2. Lookup Father
            pipeline.push(
                {
                    $lookup: {
                        from: 'persons',
                        localField: 'fatherId',
                        foreignField: '_id',
                        as: 'father'
                    }
                },
                { $unwind: { path: '$father', preserveNullAndEmptyArrays: true } }
            );

            // 3. Match Father Name (if 2+ parts)
            if (nameParts.length >= 2) {
                pipeline.push({
                    $match: {
                        'father.fullName': { $regex: `^${escapeRegex(nameParts[1])}`, $options: 'i' }
                    }
                });
            }

            // 4. Lookup Grandfather (if 3+ parts)
            if (nameParts.length >= 3) {
                pipeline.push(
                    {
                        $lookup: {
                            from: 'persons',
                            localField: 'father.fatherId',
                            foreignField: '_id',
                            as: 'grandfather'
                        }
                    },
                    { $unwind: { path: '$grandfather', preserveNullAndEmptyArrays: true } },
                    {
                        $match: {
                            'grandfather.fullName': { $regex: `^${escapeRegex(nameParts[2])}`, $options: 'i' }
                        }
                    }
                );
            }

            // 5. Project to match frontend expected structure
            // Frontend expects: { _id, fullName, fatherId: { fullName, generation }, ... }
            pipeline.push({
                $project: {
                    _id: 1,
                    fullName: 1,
                    nickname: 1,
                    generation: 1,
                    gender: 1,
                    birthDate: 1,
                    deathDate: 1,
                    isAlive: 1,
                    birthPlace: 1,
                    currentResidence: 1,
                    occupation: 1,
                    biography: 1,
                    notes: 1,
                    siblingOrder: 1,
                    order: 1,
                    createdBy: 1,
                    createdAt: 1,
                    lastModifiedBy: 1,
                    fatherId: {
                        _id: '$father._id',
                        fullName: '$father.fullName',
                        generation: '$father.generation'
                    },
                    isRoot: 1
                }
            });

            // 6. Sort
            pipeline.push({ $sort: { generation: 1, order: 1 } });

            results = await Person.aggregate(pipeline);
        }

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Get persons error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب أفراد العائلة' });
    }
});

/**
 * Get person by ID
 */
router.get('/persons/:id', authenticateFTToken, requireFTPermission('manage-members'), async (req, res) => {
    try {
        const person = await Person.findById(req.params.id)
            .populate('fatherId', 'fullName generation');

        if (!person) {
            return res.status(404).json({ success: false, message: 'الشخص غير موجود' });
        }

        res.json({
            success: true,
            data: person
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Get person error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الشخص' });
    }
});

/**
 * Create new person
 */
router.post('/persons', authenticateFTToken, requireFTPermission('manage-members'), async (req, res) => {
    try {
        const personData = {
            ...req.body,
            createdBy: req.ftUser.username,
            lastModifiedBy: req.ftUser.username
        };

        // Note: Rate limiting removed - editors can now add unlimited entries

        const person = new Person(personData);
        await person.save();

        // Invalidate tree cache
        treeCache.invalidate();

        // Log the action
        await AuditLog.logAction({
            action: 'FT_PERSON_CREATED',
            category: 'data-management',
            resource: 'person',
            resourceId: person._id.toString(),
            user: req.ftUser.username,
            userRole: req.ftUser.role,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            dashboard: 'family-tree-dashboard',
            details: { fullName: person.fullName, generation: person.generation },
            success: true
        });

        res.status(201).json({
            success: true,
            message: 'تمت إضافة الشخص بنجاح',
            data: person
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Create person error:', error);
        res.status(500).json({ success: false, message: 'خطأ في إضافة الشخص' });
    }
});

/**
 * Update person
 */
router.put('/persons/:id', authenticateFTToken, requireFTPermission('manage-members'), async (req, res) => {
    try {
        const person = await Person.findById(req.params.id);

        if (!person) {
            return res.status(404).json({ success: false, message: 'الشخص غير موجود' });
        }

        // Check ownership for non-super-admins
        if (req.ftUser.role !== 'ft-super-admin') {
            if (person.createdBy && person.createdBy !== req.ftUser.username) {
                return res.status(403).json({
                    success: false,
                    message: 'غير مصرح لك بتعديل هذا السجل. يمكنك فقط تعديل السجلات التي قمت بإضافتها.'
                });
            }
            // Strict check for legacy records (no createdBy) - Optional: Disable editing for Editors
            if (!person.createdBy) {
                return res.status(403).json({
                    success: false,
                    message: 'غير مصرح لك بتعديل السجلات القديمة.'
                });
            }
        }

        // Add lastModifiedBy
        const updateData = { ...req.body, lastModifiedBy: req.ftUser.username };

        const updatedPerson = await Person.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Invalidate tree cache
        treeCache.invalidate();

        // Log the action
        await AuditLog.logAction({
            action: 'FT_PERSON_UPDATED',
            category: 'data-management',
            resource: 'person',
            resourceId: updatedPerson._id.toString(),
            user: req.ftUser.username,
            userRole: req.ftUser.role,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            dashboard: 'family-tree-dashboard',
            details: { fullName: updatedPerson.fullName, changes: Object.keys(req.body) },
            success: true
        });

        res.json({
            success: true,
            message: 'تم تحديث بيانات الشخص بنجاح',
            data: updatedPerson
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Update person error:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث بيانات الشخص' });
    }
});

// Helper for recursive delete
async function deletePersonRecursively(id) {
    const children = await Person.find({ fatherId: id });
    for (const child of children) {
        await deletePersonRecursively(child._id);
    }
    await Person.findByIdAndDelete(id);
}

/**
 * Delete person
 * - ft-super-admin: Can delete any person (with cascade option)
 * - tree_editor: Can only delete persons they created (no cascade)
 */
router.delete('/persons/:id', authenticateFTToken, requireFTPermission('manage-members'), async (req, res) => {
    try {
        const person = await Person.findById(req.params.id);

        if (!person) {
            return res.status(404).json({ success: false, message: 'الشخص غير موجود' });
        }

        const isSuperAdmin = req.ftUser.role === 'ft-super-admin';
        const isCascade = req.query.cascade === 'true';

        // Editors can only delete records they created
        if (!isSuperAdmin) {
            // Check ownership
            if (!person.createdBy || person.createdBy !== req.ftUser.username) {
                return res.status(403).json({
                    success: false,
                    message: 'غير مصرح لك بحذف هذا السجل. يمكنك فقط حذف السجلات التي قمت بإضافتها.'
                });
            }

            // Editors cannot cascade delete
            if (isCascade) {
                return res.status(403).json({
                    success: false,
                    message: 'الحذف المتسلسل متاح فقط للمدير الأعلى.'
                });
            }
        }

        // Check if person has children
        const hasChildren = await Person.countDocuments({ fatherId: req.params.id });
        if (hasChildren > 0 && !isCascade) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف شخص له أبناء في الشجرة. يجب حذف الأبناء أولاً أو التواصل مع المدير الأعلى للحذف المتسلسل.'
            });
        }

        if (isCascade && isSuperAdmin) {
            await deletePersonRecursively(req.params.id);
        } else {
            await Person.findByIdAndDelete(req.params.id);
        }

        // Invalidate tree cache
        treeCache.invalidate();

        // Log the action
        await AuditLog.logAction({
            action: 'FT_PERSON_DELETED',
            category: 'data-management',
            resource: 'person',
            resourceId: req.params.id,
            user: req.ftUser.username,
            userRole: req.ftUser.role,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            dashboard: 'family-tree-dashboard',
            details: { fullName: person.fullName, generation: person.generation, cascade: isCascade },
            success: true
        });

        res.json({
            success: true,
            message: 'تم حذف الشخص بنجاح'
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Delete person error:', error);
        res.status(500).json({ success: false, message: 'خطأ في حذف الشخص' });
    }
});


// ==================== BACKUP MANAGEMENT ====================

/**
 * Get list of Family Tree backups
 */
router.get('/backups', authenticateFTToken, requireFTPermission('create-backups'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const backups = await BackupService.getBackups('family-tree', limit);

        res.json({
            success: true,
            data: backups
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Get backups error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب النسخ الاحتياطية' });
    }
});

/**
 * Get backup details
 */
router.get('/backups/:backupId', authenticateFTToken, requireFTPermission('create-backups'), async (req, res) => {
    try {
        const { backupId } = req.params;
        const includeData = req.query.includeData === 'true';
        const backup = await BackupService.getBackupDetails(backupId, includeData);

        if (!backup) {
            return res.status(404).json({ success: false, message: 'النسخة الاحتياطية غير موجودة' });
        }

        res.json({
            success: true,
            data: backup
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Get backup details error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل النسخة الاحتياطية' });
    }
});

/**
 * Create manual Family Tree backup
 */
router.post('/backups/create', authenticateFTToken, requireFTPermission('create-backups'), async (req, res) => {
    try {
        const result = await BackupService.createFamilyTreeBackup(
            'manual',
            req.ftUser.username,
            req
        );

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'تم إنشاء النسخة الاحتياطية بنجاح',
                data: result.backup
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل إنشاء النسخة الاحتياطية',
                error: result.error
            });
        }
    } catch (error) {
        console.error('[FT-DASHBOARD] Create backup error:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنشاء النسخة الاحتياطية' });
    }
});

/**
 * Restore Family Tree from backup
 * FT Super Admin only - requires confirmation
 */
router.post('/backups/:backupId/restore', authenticateFTToken, requireFTSuperAdmin, async (req, res) => {
    try {
        const { backupId } = req.params;
        const { confirmRestore } = req.body;

        // Require explicit confirmation
        if (confirmRestore !== true) {
            return res.status(400).json({
                success: false,
                message: 'يجب تأكيد الاستعادة. أرسل confirmRestore: true للمتابعة',
                requireConfirmation: true
            });
        }

        const result = await BackupService.restoreFamilyTreeBackup(
            backupId,
            req.ftUser.username,
            req
        );

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                restoredRecords: result.restoredRecords,
                preRestoreBackupId: result.preRestoreBackupId
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        console.error('[FT-DASHBOARD] Restore backup error:', error);
        res.status(500).json({ success: false, message: 'خطأ في استعادة النسخة الاحتياطية' });
    }
});

/**
 * Delete a Family Tree backup
 * FT Super Admin only
 */
router.delete('/backups/:backupId', authenticateFTToken, requireFTSuperAdmin, async (req, res) => {
    try {
        const { backupId } = req.params;
        const result = await BackupService.deleteBackup(backupId, req.ftUser.username, req);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        console.error('[FT-DASHBOARD] Delete backup error:', error);
        res.status(500).json({ success: false, message: 'خطأ في حذف النسخة الاحتياطية' });
    }
});

// ==================== BACKUP SETTINGS ====================

/**
 * Get backup settings (FT Super Admin only)
 */
router.get('/backup-settings', authenticateFTToken, requireFTSuperAdmin, async (req, res) => {
    try {
        const settings = await BackupSettings.getSettings();
        res.json({
            success: true,
            data: {
                familyTreeBackup: settings.familyTreeBackup,
                globalSettings: settings.globalSettings
            }
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Get backup settings error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب إعدادات النسخ الاحتياطي' });
    }
});

/**
 * Update backup settings (FT Super Admin only)
 */
router.put('/backup-settings', authenticateFTToken, requireFTSuperAdmin, async (req, res) => {
    try {
        const { enabled, intervalHours, maxBackupsToKeep } = req.body;

        const updates = {};
        if (enabled !== undefined) updates['familyTreeBackup.enabled'] = enabled;
        if (intervalHours !== undefined) updates['familyTreeBackup.intervalHours'] = intervalHours;
        if (maxBackupsToKeep !== undefined) updates['familyTreeBackup.maxBackupsToKeep'] = maxBackupsToKeep;

        const settings = await BackupSettings.updateSettings(updates, req.ftUser.username);

        res.json({
            success: true,
            message: 'تم تحديث إعدادات النسخ الاحتياطي',
            data: settings.familyTreeBackup
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Update backup settings error:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث إعدادات النسخ الاحتياطي' });
    }
});

// ==================== AUDIT LOGS ====================

/**
 * Get Family Tree related audit logs (FT Super Admin only)
 */
router.get('/audit-logs', authenticateFTToken, requireFTSuperAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await AuditLog.find({
            dashboard: 'family-tree-dashboard'
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('[FT-DASHBOARD] Get audit logs error:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب سجلات التدقيق' });
    }
});

module.exports = router;

// Helper: Build full 5-part name for a person (up to 5 ancestors)
async function buildFatherFullName(person) {
    if (!person) return '';

    const names = [person.fullName.split(' ')[0]]; // First name only
    let current = person;
    let count = 0;
    const maxAncestors = 4; // To make it 5 names total (person + 4 ancestors)

    while (current.fatherId && count < maxAncestors) {
        const father = await Person.findById(current.fatherId).select('fullName fatherId').lean();
        if (father) {
            names.push(father.fullName.split(' ')[0]); // First name only
            current = father;
            count++;
        } else {
            break;
        }
    }

    return names.join(' بن ') + ' الشاعر';
}

// Helper: Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
