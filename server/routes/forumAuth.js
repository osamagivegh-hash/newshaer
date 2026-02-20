const express = require('express');
const jwt = require('jsonwebtoken');
const ForumUser = require('../models/ForumUser');
const { forumAuthMiddleware } = require('../middleware/forumAuthMid');
const router = express.Router();

const FORUM_JWT_SECRET = process.env.FORUM_JWT_SECRET || 'fallback_forum_secret_2026';

// Register User
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check for existing user
        const existingEmail = await ForumUser.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
        }

        const existingUsername = await ForumUser.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم مأخوذ' });
        }

        // Create new user (default role is user)
        const user = new ForumUser({ username, email, password });
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            FORUM_JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'تم التسجيل بنجاح',
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Forum Registration Error:', error);
        res.status(500).json({ success: false, message: 'فشل في عملية التسجيل', error: error.message });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
        }

        // Support login by email OR username
        const user = await ForumUser.findOne({
            $or: [{ email: email.toLowerCase() }, { username: email }]
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            FORUM_JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Forum Login Error:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول' });
    }
});

// Get Current User Profile
router.get('/me', forumAuthMiddleware, async (req, res) => {
    try {
        res.json({ success: true, user: req.forumUser });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server check error' });
    }
});

// Update Profile
router.patch('/profile', forumAuthMiddleware, async (req, res) => {
    try {
        const { bio, avatar } = req.body;
        const user = await ForumUser.findById(req.forumUser._id);

        if (bio !== undefined) user.bio = bio;
        if (avatar !== undefined) user.avatar = avatar; // Will handle actual cloudinary URL on frontend

        await user.save();
        res.json({ success: true, user: user.toJSON() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
});

module.exports = router;
