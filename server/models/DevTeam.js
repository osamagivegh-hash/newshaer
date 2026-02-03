/**
 * Development Team Models
 * - DevTeamMessage: Messages from users to the development team
 * - DevTeamPost: Announcements and posts from the development team
 * - DevTeamAlert: Alert boxes for important announcements
 */

const mongoose = require('mongoose');

// Message Schema - for user contact messages
const DevTeamMessageSchema = new mongoose.Schema({
    // Sender information
    senderName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    senderEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'البريد الإلكتروني غير صالح']
    },
    senderPhone: {
        type: String,
        trim: true
    },

    // Message content
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 5000
    },

    // Message type/category
    category: {
        type: String,
        enum: ['suggestion', 'bug', 'question', 'feedback', 'other'],
        default: 'other'
    },

    // Status tracking
    status: {
        type: String,
        enum: ['new', 'read', 'in_progress', 'resolved', 'archived'],
        default: 'new'
    },

    // Admin response
    response: {
        type: String,
        default: ''
    },
    respondedBy: {
        type: String,
        default: ''
    },
    respondedAt: {
        type: Date
    },

    // Metadata
    ipAddress: String,
    userAgent: String,

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Post Schema - for team announcements with rich text
const DevTeamPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    // Rich HTML content
    content: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        maxlength: 500
    },

    // Post type
    postType: {
        type: String,
        enum: ['announcement', 'update', 'feature', 'maintenance', 'general'],
        default: 'general'
    },

    // Author information
    author: {
        type: String,
        default: 'فريق التطوير'
    },
    authorRole: {
        type: String,
        default: 'مطور'
    },
    authorAvatar: {
        type: String,
        default: ''
    },

    // Visibility
    isPublished: {
        type: Boolean,
        default: true
    },
    isPinned: {
        type: Boolean,
        default: false
    },

    // GS Priority Post - always displayed first
    isFounderPost: {
        type: Boolean,
        default: false
    },

    // Order for display (lower = higher priority)
    order: {
        type: Number,
        default: 0
    },

    // Icon/emoji for visual
    icon: {
        type: String,
        default: '📢'
    },

    // Featured image
    featuredImage: {
        type: String,
        default: ''
    },

    // Styling options
    paragraphSpacing: {
        type: String,
        enum: ['compact', 'normal', 'spacious'],
        default: 'normal'
    },
    textAlignment: {
        type: String,
        enum: ['right', 'center', 'justify'],
        default: 'right'
    },

    // Article mode - displays full content by default
    isArticle: {
        type: Boolean,
        default: false
    },
    // Max height before "Read More" appears (in pixels, 0 = no limit)
    maxCollapsedHeight: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Alert Schema - for important developer alerts at top of page
const DevTeamAlertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    // Rich HTML content
    content: {
        type: String,
        required: true
    },

    // Alert type determines styling
    alertType: {
        type: String,
        enum: ['info', 'success', 'warning', 'danger', 'announcement'],
        default: 'info'
    },

    // Appearance
    backgroundColor: {
        type: String,
        default: '#0d9488' // teal
    },
    textColor: {
        type: String,
        default: '#ffffff'
    },
    icon: {
        type: String,
        default: '📢'
    },

    // Button options
    showButton: {
        type: Boolean,
        default: true
    },
    buttonText: {
        type: String,
        default: 'عرض التفاصيل'
    },
    buttonLink: {
        type: String,
        default: '/family-tree/dev-team'
    },

    // Visibility & behavior
    isActive: {
        type: Boolean,
        default: true
    },
    isDismissible: {
        type: Boolean,
        default: true
    },
    isSticky: {
        type: Boolean,
        default: false
    },

    // Display order (lower = higher priority)
    order: {
        type: Number,
        default: 0
    },

    // Scheduling
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes
DevTeamMessageSchema.index({ status: 1, createdAt: -1 });
DevTeamMessageSchema.index({ category: 1 });
DevTeamMessageSchema.index({ senderEmail: 1 });

DevTeamPostSchema.index({ isPublished: 1, createdAt: -1 });
DevTeamPostSchema.index({ isPinned: -1, createdAt: -1 });

DevTeamAlertSchema.index({ isActive: 1, order: 1 });
DevTeamAlertSchema.index({ startDate: 1, endDate: 1 });

const DevTeamMessage = mongoose.model('DevTeamMessage', DevTeamMessageSchema);
const DevTeamPost = mongoose.model('DevTeamPost', DevTeamPostSchema);
const DevTeamAlert = mongoose.model('DevTeamAlert', DevTeamAlertSchema);

module.exports = {
    DevTeamMessage,
    DevTeamPost,
    DevTeamAlert
};
