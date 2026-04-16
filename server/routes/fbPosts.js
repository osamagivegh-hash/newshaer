const express = require('express');
const FbPost = require('../models/FbPost');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const CATEGORIES = [
  'تعازي',
  'أفراح وزواجات',
  'صلح وجاهات واحتفالات وفعاليات',
  'مواليد',
  'إعلانات',
  'أخبار عامة'
];

// GET /api/fb-posts - paginated posts, newest first
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const category = req.query.category || null;
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const filter = {};
  if (category && CATEGORIES.includes(category)) {
    filter.category = category;
  }
  if (search) {
    filter.message = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    FbPost.find(filter).sort({ created_time: -1 }).skip(skip).limit(limit).lean(),
    FbPost.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      categories: CATEGORIES
    }
  });
}));

// GET /api/fb-posts/stats - category counts
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await FbPost.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const total = await FbPost.countDocuments();

  res.json({
    success: true,
    data: {
      total,
      categories: stats.map(s => ({ name: s._id, count: s.count }))
    }
  });
}));

// GET /api/fb-posts/latest - آخر 8 أخبار للـ Hero Slider
router.get('/latest', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
  const posts = await FbPost.find({ image_url: { $ne: null, $ne: '' } })
    .sort({ created_time: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: posts });
}));

// POST /api/fb-posts/sync - مزامنة يدوية
router.post('/sync', asyncHandler(async (req, res) => {
  const { syncNewPosts } = require('../services/fbSync');
  const result = await syncNewPosts();
  res.json({ success: true, data: result });
}));

// GET /api/fb-posts/:id - single post
router.get('/:id', asyncHandler(async (req, res) => {
  const post = await FbPost.findById(req.params.id).lean();
  if (!post) {
    return res.status(404).json({ success: false, message: 'الخبر غير موجود' });
  }
  res.json({ success: true, data: post });
}));

module.exports = router;
