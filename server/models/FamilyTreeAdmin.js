/**
 * Family Tree Admin Model
 * 
 * COMPLETELY SEPARATE from the main CMS Admin model.
 * Uses its own collection, credentials, and authentication.
 * 
 * Security Notes:
 * - Stored in separate 'family_tree_admins' collection
 * - Uses separate JWT secret (FAMILY_TREE_JWT_SECRET)
 * - NO shared authentication with CMS
 * - Cannot access CMS dashboard
 * - CMS admins cannot access Family Tree dashboard
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const familyTreeAdminSchema = new mongoose.Schema({
    // Unique identifier
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 50
    },

    // Email for password recovery
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    // Hashed password
    password: {
        type: String,
        required: true,
        select: false // Never return password in queries by default
    },

    // Display name (Arabic supported)
    displayName: {
        type: String,
        required: true,
        trim: true
    },

    // Role within Family Tree Dashboard ONLY
    // ft-super-admin: Full control of Family Tree Dashboard
    // ft-editor: Can add/edit family members and tree structure
    role: {
        type: String,
        enum: ['ft-super-admin', 'ft-editor'],
        default: 'ft-editor',
        required: true
    },

    // Granular permissions (for future extensibility)
    permissions: [{
        type: String,
        enum: [
            'manage-members',      // Add/edit/delete family members
            'manage-tree',         // Modify tree structure
            'manage-content',      // Edit tree content pages
            'create-backups',      // Create manual backups
            'restore-backups',     // Restore from backup (ft-super-admin only)
            'manage-users',        // Create/edit ft-editors (ft-super-admin only)
            'view-audit-logs',     // View audit logs (ft-super-admin only)
            'manage-settings'      // Manage FT dashboard settings (ft-super-admin only)
        ]
    }],

    // Account status
    isActive: {
        type: Boolean,
        default: true
    },

    // Created by (for audit trail)
    createdBy: {
        type: String,
        default: 'system'
    },

    // Last login tracking
    lastLogin: {
        type: Date,
        default: null
    },

    // Failed login attempts (for security)
    failedLoginAttempts: {
        type: Number,
        default: 0
    },

    // Account lockout
    lockedUntil: {
        type: Date,
        default: null
    },

    // Password change tracking
    passwordChangedAt: {
        type: Date,
        default: null
    },

    // Password reset token (hashed)
    passwordResetToken: {
        type: String,
        select: false
    },

    passwordResetExpires: {
        type: Date,
        select: false
    }
}, {
    timestamps: true,
    collection: 'family_tree_admins' // Separate collection!
});

// Indexes for performance
// Note: unique:true on username/email already creates indexes
// Only add additional indexes for query patterns
familyTreeAdminSchema.index({ role: 1 });
familyTreeAdminSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
familyTreeAdminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12); // Higher rounds for security
        this.password = await bcrypt.hash(this.password, salt);
        this.passwordChangedAt = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
familyTreeAdminSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
familyTreeAdminSchema.methods.isLocked = function () {
    if (!this.lockedUntil) return false;
    return this.lockedUntil > new Date();
};

// Method to increment failed login attempts
familyTreeAdminSchema.methods.incrementFailedAttempts = async function () {
    this.failedLoginAttempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
        this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.save();
};

// Method to reset failed login attempts
familyTreeAdminSchema.methods.resetFailedAttempts = async function () {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.lastLogin = new Date();
    await this.save();
};

// Method to check if password was changed after JWT was issued
familyTreeAdminSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return jwtTimestamp < changedTimestamp;
    }
    return false;
};

// Static method to get default permissions by role
familyTreeAdminSchema.statics.getDefaultPermissions = function (role) {
    const permissions = {
        'ft-super-admin': [
            'manage-members',
            'manage-tree',
            'manage-content',
            'create-backups',
            'restore-backups',
            'manage-users',
            'view-audit-logs',
            'manage-settings'
        ],
        'ft-editor': [
            'manage-members',
            'manage-tree',
            'manage-content',
            'create-backups'
        ]
    };

    return permissions[role] || [];
};

// Static method to initialize the Family Tree Super Admin
familyTreeAdminSchema.statics.initializeSuperAdmin = async function () {
    try {
        const ftSuperAdminUsername = (process.env.FAMILY_TREE_ADMIN_USERNAME || 'ft_admin').trim();
        const ftSuperAdminEmail = (process.env.FAMILY_TREE_ADMIN_EMAIL || 'ft_admin@alshaer.family').trim();
        const ftSuperAdminPassword = (process.env.FAMILY_TREE_ADMIN_PASSWORD || 'FT_Admin@2024!Secure').trim();

        const existing = await this.findOne({ role: 'ft-super-admin' });

        if (!existing) {
            const superAdmin = new this({
                username: ftSuperAdminUsername,
                email: ftSuperAdminEmail,
                password: ftSuperAdminPassword,
                displayName: 'مدير شجرة العائلة',
                role: 'ft-super-admin',
                permissions: this.getDefaultPermissions('ft-super-admin'),
                isActive: true,
                createdBy: 'system'
            });

            await superAdmin.save();
            console.log('✓ Family Tree Super Admin created');
            console.log(`  Username: ${ftSuperAdminUsername}`);
            console.log(`  Email: ${ftSuperAdminEmail}`);
            return superAdmin;
        }

        return existing;
    } catch (error) {
        console.error('Error initializing Family Tree Super Admin:', error);
        throw error;
    }
};

const FamilyTreeAdmin = mongoose.model('FamilyTreeAdmin', familyTreeAdminSchema);

module.exports = FamilyTreeAdmin;
