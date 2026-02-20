const jwt = require('jsonwebtoken');
const ForumUser = require('../models/ForumUser');

const FORUM_JWT_SECRET = process.env.FORUM_JWT_SECRET || 'fallback_forum_secret_2026';

const forumAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح للوصول، يرجى تسجيل الدخول أولاً'
            });
        }

        const decoded = jwt.verify(token, FORUM_JWT_SECRET);
        const user = await ForumUser.findById(decoded.id).select('-password');

        if (!user || !user.isActive) {
            throw new Error('حساب المستخدم غير موجود أو معطل');
        }

        req.forumUser = user;
        next();
    } catch (error) {
        console.error('Forum Auth Error:', error.message);
        res.status(401).json({
            success: false,
            message: 'الجلسة منتهية أو غير صالحة. الرجاء تسجيل الدخول مجدداً.'
        });
    }
};

const forumModeratorMiddleware = (req, res, next) => {
    if (req.forumUser && (req.forumUser.role === 'moderator' || req.forumUser.role === 'admin')) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'عذراً، تحتاج إلى صلاحيات إشراف لهذا الإجراء'
        });
    }
};

module.exports = {
    forumAuthMiddleware,
    forumModeratorMiddleware
};
