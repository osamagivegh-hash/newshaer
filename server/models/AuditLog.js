/**
 * Audit Log Schema for Security and Compliance
 * Tracks all backup and restore actions with full audit trail
 * 
 * This schema supports:
 * - Backup creation logging
 * - Restore action logging
 * - User action tracking
 * - IP and User-Agent tracking for security
 */

const mongoose = require('mongoose');

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
    // Action type
    action: {
        type: String,
        enum: [
            // Backup actions
            'BACKUP_CREATED',
            'BACKUP_FAILED',
            'BACKUP_DELETED',
            'BACKUP_CLEANUP',
            // Restore actions
            'RESTORE_INITIATED',
            'RESTORE_COMPLETED',
            'RESTORE_FAILED',
            'RESTORE_CANCELLED',
            // Auth actions
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'PASSWORD_CHANGED',
            // User management
            'USER_CREATED',
            'USER_UPDATED',
            'USER_DELETED',
            'USER_ROLE_CHANGED',
            // Data actions
            'DATA_CREATED',
            'DATA_UPDATED',
            'DATA_DELETED',
            // Family Tree actions
            'FT_PERSON_CREATED',
            'FT_PERSON_UPDATED',
            'FT_PERSON_DELETED',
            // System actions
            'SYSTEM_STARTUP',
            'SCHEDULED_BACKUP_TRIGGERED',
            'SETTINGS_CHANGED'
        ],
        required: true,
        index: true
    },

    // Category for filtering
    category: {
        type: String,
        enum: ['backup', 'restore', 'auth', 'user', 'data', 'system', 'data-management'],
        required: true,
        index: true
    },

    // Resource type (backup, persons, news, etc.)
    resource: {
        type: String,
        required: true,
        index: true
    },

    // Resource ID if applicable
    resourceId: {
        type: String
    },

    // Who performed the action
    user: {
        type: String,
        required: true,
        index: true
    },

    // User role at time of action
    userRole: {
        type: String,
        enum: ['super-admin', 'admin', 'editor', 'ft-editor', 'system'],
        default: 'system'
    },

    // IP address
    ipAddress: {
        type: String
    },

    // User agent string
    userAgent: {
        type: String
    },

    // Dashboard context
    dashboard: {
        type: String,
        enum: ['family-tree-dashboard', 'cms-dashboard', 'system', null]
    },

    // Detailed information about the action
    details: {
        type: mongoose.Schema.Types.Mixed
    },

    // Success/failure indicator
    success: {
        type: Boolean,
        default: true
    },

    // Error message if failed
    errorMessage: {
        type: String
    },

    // Timestamp
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false,
    collection: 'audit_logs'
});

// Compound indexes for common queries
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function (logData) {
    try {
        const log = new this({
            ...logData,
            createdAt: new Date()
        });
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to write audit log:', error);
        return null;
    }
};

// Static method to log backup action
auditLogSchema.statics.logBackupAction = async function (action, backupId, user, details = {}, req = null) {
    return await this.logAction({
        action,
        category: 'backup',
        resource: 'backup',
        resourceId: backupId,
        user: user || 'system',
        userRole: details.userRole || 'system',
        ipAddress: req?.ip || req?.connection?.remoteAddress || 'system',
        userAgent: req?.get?.('User-Agent') || 'system',
        dashboard: details.dashboard || 'system',
        details,
        success: action !== 'BACKUP_FAILED',
        errorMessage: details.errorMessage
    });
};

// Static method to log restore action
auditLogSchema.statics.logRestoreAction = async function (action, backupId, user, details = {}, req = null) {
    return await this.logAction({
        action,
        category: 'restore',
        resource: 'backup',
        resourceId: backupId,
        user: user || 'system',
        userRole: details.userRole || 'system',
        ipAddress: req?.ip || req?.connection?.remoteAddress || 'system',
        userAgent: req?.get?.('User-Agent') || 'system',
        dashboard: details.dashboard || 'system',
        details,
        success: action !== 'RESTORE_FAILED',
        errorMessage: details.errorMessage
    });
};

// Static method to get recent logs
auditLogSchema.statics.getRecentLogs = async function (limit = 100, category = null) {
    const query = category ? { category } : {};
    return await this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to get logs by user
auditLogSchema.statics.getLogsByUser = async function (username, limit = 50) {
    return await this.find({ user: username })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to cleanup old logs (keep last N days)
auditLogSchema.statics.cleanupOldLogs = async function (daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deleteMany({ createdAt: { $lt: cutoffDate } });
    return result.deletedCount;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
