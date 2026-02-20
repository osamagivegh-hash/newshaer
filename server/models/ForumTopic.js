const mongoose = require('mongoose');

const forumTopicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150
    },
    content: {
        type: String,
        required: true, // Rich HTML content
        minlength: 10
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumUser',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumCategory',
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    replyCount: {
        type: Number,
        default: 0
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Add index for fast querying by category, lastActivity, and pinned
forumTopicSchema.index({ category: 1, isPinned: -1, lastActivity: -1 });

module.exports = mongoose.model('ForumTopic', forumTopicSchema);
