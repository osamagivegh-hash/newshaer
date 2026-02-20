const express = require('express');
const { forumAuthMiddleware, forumModeratorMiddleware } = require('../middleware/forumAuthMid');
const ForumUser = require('../models/ForumUser');
const ForumTopic = require('../models/ForumTopic');
const ForumPost = require('../models/ForumPost');

const router = express.Router();

// Get all users
router.get('/users', forumAuthMiddleware, forumModeratorMiddleware, async (req, res) => {
    try {
        const users = await ForumUser.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving users' });
    }
});

// Update user role
router.put('/users/:id/role', forumAuthMiddleware, forumModeratorMiddleware, async (req, res) => {
    try {
        const { role } = req.body;
        // Only admins can promote others to admin
        if (role === 'admin' && req.forumUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admins can make other admins' });
        }

        const user = await ForumUser.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.role = role;
        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating user' });
    }
});

// Deactivate / Delete user (soft delete)
router.delete('/users/:id', forumAuthMiddleware, forumModeratorMiddleware, async (req, res) => {
    try {
        const user = await ForumUser.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Ensure we don't delete the last admin or the admin themselves easily
        if (user.role === 'admin' && req.forumUser._id.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Cannot deactivate another admin' });
        }

        user.isActive = !user.isActive; // Toggle active status
        await user.save();

        res.json({ success: true, user, message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deactivating user' });
    }
});

// Admin Delete Topic (Soft Delete)
router.delete('/topics/:id', forumAuthMiddleware, forumModeratorMiddleware, async (req, res) => {
    try {
        const topic = await ForumTopic.findById(req.params.id);
        if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

        topic.isActive = false;
        await topic.save();

        // Also deactivate all posts in this topic
        await ForumPost.updateMany({ topic: topic._id }, { isActive: false });

        res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting topic' });
    }
});

// Admin Delete Post (Soft Delete)
router.delete('/posts/:id', forumAuthMiddleware, forumModeratorMiddleware, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        post.isActive = false;
        await post.save();

        // Update reply count
        await ForumTopic.findByIdAndUpdate(post.topic, { $inc: { replyCount: -1 } });

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting post' });
    }
});

module.exports = router;
