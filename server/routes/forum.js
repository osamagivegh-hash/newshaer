const express = require('express');
const { forumAuthMiddleware, forumModeratorMiddleware } = require('../middleware/forumAuthMid');
const ForumCategory = require('../models/ForumCategory');
const ForumTopic = require('../models/ForumTopic');
const ForumPost = require('../models/ForumPost');
const ForumUser = require('../models/ForumUser');

const router = express.Router();

/** CATEGORY ROUTES **/
// Public: Get all active categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await ForumCategory.find({ isActive: true }).sort('order');

        // Add counts dynamically (in a real scalable system, you'd cache these or aggregate)
        const categoriesWithStats = await Promise.all(
            categories.map(async (cat) => {
                const topicCount = await ForumTopic.countDocuments({ category: cat._id, isActive: true });
                const postCount = await ForumPost.countDocuments({ category: cat._id, isActive: true });
                return {
                    ...cat.toObject(),
                    topicCount,
                    postCount
                };
            })
        );

        res.json({ success: true, categories: categoriesWithStats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving categories' });
    }
});

// Admin/Moderator: Create a new category
router.post('/categories', forumAuthMiddleware, forumModeratorMiddleware, async (req, res) => {
    try {
        const { title, description, icon, order } = req.body;
        const newCategory = new ForumCategory({ title, description, icon, order });
        await newCategory.save();
        res.status(201).json({ success: true, category: newCategory });
    } catch (error) {
        res.status(400).json({ success: false, message: 'فشل إنشاء القسم', error: error.message });
    }
});

/** TOPIC ROUTES **/
// Public: Get topics for a category
router.get('/categories/:categoryId/topics', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const category = await ForumCategory.findById(req.params.categoryId);
        if (!category) return res.status(404).json({ success: false, message: 'القسم غير موجود' });

        const topics = await ForumTopic.find({ category: req.params.categoryId, isActive: true })
            .populate('author', 'username avatar role')
            .sort({ isPinned: -1, lastActivity: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ForumTopic.countDocuments({ category: req.params.categoryId, isActive: true });

        res.json({
            success: true,
            topics,
            category,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving topics' });
    }
});

// Create Topic
router.post('/categories/:categoryId/topics', forumAuthMiddleware, async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content || content.length < 10) {
            return res.status(400).json({ success: false, message: 'الرجاء إدخال عنوان ومحتوى مناسب للموضوع' });
        }

        const category = await ForumCategory.findById(req.params.categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'القسم غير موجود' });
        }

        const newTopic = new ForumTopic({
            title,
            content,
            author: req.forumUser._id,
            category: category._id
        });

        await newTopic.save();

        res.status(201).json({ success: true, topic: newTopic });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء إنشاء الموضوع' });
    }
});

// Get Single Topic
router.get('/topics/:id', async (req, res) => {
    try {
        const topic = await ForumTopic.findById(req.params.id)
            .populate('author', 'username avatar role joinDate')
            .populate('category', 'title');

        if (!topic || !topic.isActive) {
            return res.status(404).json({ success: false, message: 'الموضوع غير موجود أو محذوف' });
        }

        // Increment Views
        topic.views += 1;
        await topic.save();

        res.json({ success: true, topic });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء جلب الموضوع' });
    }
});

// Edit Topic (Author only)
router.put('/topics/:id', forumAuthMiddleware, async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content || content.length < 10) {
            return res.status(400).json({ success: false, message: 'العنوان والمحتوى مطلوبان' });
        }

        const topic = await ForumTopic.findById(req.params.id);
        if (!topic || !topic.isActive) return res.status(404).json({ success: false, message: 'الموضوع غير موجود' });

        if (topic.author.toString() !== req.forumUser._id.toString()) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية تعديل هذا الموضوع' });
        }

        if (topic.isLocked) return res.status(403).json({ success: false, message: 'الموضوع مغلق لا يمكن تعديله' });

        topic.title = title;
        topic.content = content;
        await topic.save();

        res.json({ success: true, topic });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء تعديل الموضوع' });
    }
});

// Delete Topic (Author only) (Soft merge)
router.delete('/topics/:id', forumAuthMiddleware, async (req, res) => {
    try {
        const topic = await ForumTopic.findById(req.params.id);
        if (!topic || !topic.isActive) return res.status(404).json({ success: false, message: 'الموضوع غير موجود' });

        if (topic.author.toString() !== req.forumUser._id.toString()) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية حذف هذا الموضوع' });
        }

        topic.isActive = false;
        await topic.save();

        // Deactivate posts
        await ForumPost.updateMany({ topic: topic._id }, { isActive: false });

        res.json({ success: true, message: 'تم حذف الموضوع بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء حذف الموضوع' });
    }
});

/** POST (REPLIES) ROUTES **/
// Get Posts for Topic
router.get('/topics/:topicId/posts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const posts = await ForumPost.find({ topic: req.params.topicId, isActive: true })
            .populate('author', 'username avatar role joinDate')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit);

        const total = await ForumPost.countDocuments({ topic: req.params.topicId, isActive: true });

        res.json({
            success: true,
            posts,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء جلب الردود' });
    }
});

// Reply to Topic
router.post('/topics/:topicId/posts', forumAuthMiddleware, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || content.length < 2) {
            return res.status(400).json({ success: false, message: 'محتوى الرد قصير جداً' });
        }

        const topic = await ForumTopic.findById(req.params.topicId);
        if (!topic || !topic.isActive) {
            return res.status(404).json({ success: false, message: 'الموضوع غير موجود' });
        }

        if (topic.isLocked && req.forumUser.role === 'user') {
            return res.status(403).json({ success: false, message: 'عذراً، هذا الموضوع مغلق ولا يقبل ردود جديدة' });
        }

        // Create the post
        const newPost = new ForumPost({
            content,
            author: req.forumUser._id,
            topic: topic._id,
            category: topic.category
        });

        await newPost.save();

        // Update topic lastActivity and replyCount
        topic.lastActivity = Date.now();
        topic.replyCount += 1;
        await topic.save();

        // Return full author info so UI can render immediately
        await newPost.populate('author', 'username avatar role joinDate');

        res.status(201).json({ success: true, post: newPost });
    } catch (error) {
        res.status(500).json({ success: false, message: 'فشل في إضافة الرد' });
    }
});

// Edit Post (Author only)
router.put('/posts/:id', forumAuthMiddleware, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || content.length < 2) {
            return res.status(400).json({ success: false, message: 'محتوى الرد قصير جداً' });
        }

        const post = await ForumPost.findById(req.params.id);
        if (!post || !post.isActive) return res.status(404).json({ success: false, message: 'المشاركة غير موجودة' });

        // Ensure user is author
        if (post.author.toString() !== req.forumUser._id.toString()) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية تعديل هذه المشاركة' });
        }

        const topic = await ForumTopic.findById(post.topic);
        if (topic && topic.isLocked) return res.status(403).json({ success: false, message: 'الموضوع مغلق لا يمكن التعديل' });

        post.content = content;
        await post.save();
        await post.populate('author', 'username avatar role joinDate');

        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء تعديل المشاركة' });
    }
});

// Delete Post (Author only)
router.delete('/posts/:id', forumAuthMiddleware, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post || !post.isActive) return res.status(404).json({ success: false, message: 'المشاركة غير موجودة' });

        // Ensure user is author
        if (post.author.toString() !== req.forumUser._id.toString()) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية حذف هذه المشاركة' });
        }

        const topic = await ForumTopic.findById(post.topic);
        if (topic && topic.isLocked) return res.status(403).json({ success: false, message: 'الموضوع مغلق لا يمكن الحذف' });

        post.isActive = false;
        await post.save();

        if (topic) {
            topic.replyCount -= 1;
            await topic.save();
        }

        res.json({ success: true, message: 'تم حذف المشاركة' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء حذف المشاركة' });
    }
});

// Get User Public Profile (Any user can view)
router.get('/users/:id', async (req, res) => {
    try {
        const user = await ForumUser.findById(req.params.id).select('-password');
        if (!user || !user.isActive) {
            return res.status(404).json({ success: false, message: 'العضو غير موجود أو تم حظره' });
        }

        const topicCount = await ForumTopic.countDocuments({ author: req.params.id, isActive: true });
        const postCount = await ForumPost.countDocuments({ author: req.params.id, isActive: true });

        res.json({
            success: true,
            user,
            stats: {
                topicCount,
                postCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'يوجد خطأ في جلب بيانات العضو' });
    }
});

module.exports = router;
