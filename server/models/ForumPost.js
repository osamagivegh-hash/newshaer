const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true, // Rich HTML content
        minlength: 2
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumUser',
        required: true
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumCategory',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Add index for fast querying by topic and time
forumPostSchema.index({ topic: 1, createdAt: 1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);
