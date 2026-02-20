const mongoose = require('mongoose');

const forumCategorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    icon: {
        type: String, // E.g., emoji or Material Icon name
        default: '💬'
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ForumCategory', forumCategorySchema);
