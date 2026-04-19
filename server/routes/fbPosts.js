const express = require('express');
const FbPost = require('../models/FbPost');
const { News } = require('../models');
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

// CMS English → Arabic category map (reverse of what adminMongo uses)
const CMS_TO_FB_CATEGORY = {
  'Obituaries': 'تعازي',
  'Celebrations': 'أفراح وزواجات',
  'Events': 'صلح وجاهات واحتفالات وفعاليات',
  'General': 'أخبار عامة',
  'Other': 'أخبار عامة'
};

// Convert a CMS News doc (imported from FB) to FbPost-like shape for the frontend
const newsToFbPost = (n) => ({
  _id: n._id,
  fb_post_id: n.fbPostId,
  message: n.content || n.title || '',
  created_time: n.date,
  permalink_url: n.fbPermalink || '',
  category: CMS_TO_FB_CATEGORY[n.category] || n.category || 'أخبار عامة',
  image_url: n.image || n.coverImage || null,
  imported_at: n.createdAt,
  // extra CMS fields
  _cmsTitle: n.title,
  _cmsSummary: n.summary,
  _cmsAuthor: n.author,
  _isCmsManaged: true
});

// Build merged posts list: CMS-imported (edited) versions take priority
const getMergedPosts = async (filter = {}, sort = { created_time: -1 }, skip = 0, limit = 20) => {
  // 1. Get all CMS-imported news (non-archived) with their fbPostIds
  const cmsFilter = { fbPostId: { $exists: true, $ne: null }, isArchived: { $ne: true } };
  // Apply category filter if present (translate Arabic→English for CMS query)
  if (filter.category) {
    // Find the English CMS category for this Arabic category
    const englishCat = Object.entries(CMS_TO_FB_CATEGORY).find(([, ar]) => ar === filter.category);
    if (englishCat) {
      cmsFilter.category = englishCat[0];
    }
  }
  if (filter.message) {
    // Search applies to title+content in CMS (pass regex object)
    cmsFilter.$or = [
      { title: filter.message },
      { content: filter.message }
    ];
  }

  const cmsNews = await News.find(cmsFilter).lean();
  const cmsMap = new Map(); // fb_post_id → CMS News doc
  for (const n of cmsNews) {
    if (n.fbPostId) cmsMap.set(n.fbPostId, n);
  }

  // 2. Get FB posts
  const [rawPosts, total] = await Promise.all([
    FbPost.find(filter).sort(sort).lean(),
    FbPost.countDocuments(filter)
  ]);

  // 3. Also get CMS-only news (manually created, no fbPostId) if no specific FB filter
  const manualCmsFilter = { 
    fbPostId: { $exists: false }, 
    isArchived: { $ne: true } 
  };
  if (filter.category) {
    const englishCat = Object.entries(CMS_TO_FB_CATEGORY).find(([, ar]) => ar === filter.category);
    if (englishCat) manualCmsFilter.category = englishCat[0];
  }
  if (filter.message) {
    manualCmsFilter.$or = [
      { title: filter.message },
      { content: filter.message }
    ];
  }
  const manualNews = await News.find(manualCmsFilter).lean();

  // 4. Merge: replace FB posts with CMS versions where available
  const merged = rawPosts.map(p => {
    const cmsVersion = cmsMap.get(p.fb_post_id);
    if (cmsVersion) return newsToFbPost(cmsVersion);
    return p;
  });

  // Add manually-created CMS news as fb-post-shaped items
  for (const n of manualNews) {
    merged.push(newsToFbPost(n));
  }

  // Re-sort by created_time desc
  merged.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));

  // Filter out archived CMS posts (fbPostId exists in CMS but isArchived=true)
  const archivedNews = await News.find({ fbPostId: { $exists: true }, isArchived: true }, { fbPostId: 1 }).lean();
  const archivedFbIds = new Set(archivedNews.map(n => n.fbPostId));
  const filtered = merged.filter(p => !archivedFbIds.has(p.fb_post_id));

  const totalMerged = filtered.length;
  const paged = filtered.slice(skip, skip + limit);

  return { posts: paged, total: totalMerged };
};

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
  const { posts, total } = await getMergedPosts(filter, { created_time: -1 }, skip, limit);

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
  // FB post stats
  const fbStats = await FbPost.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  // CMS overrides: count re-categorized posts
  const cmsOverrides = await News.find({ 
    fbPostId: { $exists: true, $ne: null }, 
    isArchived: { $ne: true } 
  }, { fbPostId: 1, category: 1 }).lean();

  // Manual CMS news
  const manualNews = await News.find({ 
    fbPostId: { $exists: false }, 
    isArchived: { $ne: true } 
  }, { category: 1 }).lean();

  // Start with FB stats
  const countMap = {};
  for (const s of fbStats) {
    countMap[s._id] = s.count;
  }

  // Adjust for CMS overrides (post moved from one category to another)
  const overriddenFbIds = cmsOverrides.map(n => n.fbPostId);
  if (overriddenFbIds.length > 0) {
    const originals = await FbPost.find({ fb_post_id: { $in: overriddenFbIds } }, { fb_post_id: 1, category: 1 }).lean();
    const origMap = new Map(originals.map(o => [o.fb_post_id, o.category]));

    for (const n of cmsOverrides) {
      const origCat = origMap.get(n.fbPostId);
      const newCat = CMS_TO_FB_CATEGORY[n.category] || 'أخبار عامة';
      if (origCat && origCat !== newCat) {
        countMap[origCat] = Math.max((countMap[origCat] || 0) - 1, 0);
        countMap[newCat] = (countMap[newCat] || 0) + 1;
      }
    }
  }

  // Add manual CMS news counts
  for (const n of manualNews) {
    const cat = CMS_TO_FB_CATEGORY[n.category] || 'أخبار عامة';
    countMap[cat] = (countMap[cat] || 0) + 1;
  }

  const total = Object.values(countMap).reduce((a, b) => a + b, 0);

  res.json({
    success: true,
    data: {
      total,
      categories: Object.entries(countMap)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    }
  });
}));

// GET /api/fb-posts/latest - آخر 8 أخبار للـ Hero Slider
router.get('/latest', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);

  // Get latest FB posts with images
  const fbPosts = await FbPost.find({ image_url: { $ne: null, $ne: '' } })
    .sort({ created_time: -1 })
    .limit(limit * 2) // fetch extra to allow for CMS overrides
    .lean();

  // Get CMS overrides for these posts
  const fbIds = fbPosts.map(p => p.fb_post_id);
  const cmsOverrides = await News.find({ 
    fbPostId: { $in: fbIds }, 
    isArchived: { $ne: true } 
  }).lean();
  const cmsMap = new Map(cmsOverrides.map(n => [n.fbPostId, n]));

  // Get archived ones to exclude
  const archivedNews = await News.find({ fbPostId: { $in: fbIds }, isArchived: true }, { fbPostId: 1 }).lean();
  const archivedIds = new Set(archivedNews.map(n => n.fbPostId));

  // Also get manual CMS news with images
  const manualWithImages = await News.find({ 
    fbPostId: { $exists: false }, 
    isArchived: { $ne: true },
    image: { $ne: null, $ne: '' }
  }).sort({ date: -1 }).limit(limit).lean();

  // Merge
  const merged = fbPosts
    .filter(p => !archivedIds.has(p.fb_post_id))
    .map(p => {
      const cms = cmsMap.get(p.fb_post_id);
      return cms ? newsToFbPost(cms) : p;
    });

  // Add manual CMS items
  for (const n of manualWithImages) {
    merged.push(newsToFbPost(n));
  }

  // Sort and filter for those with images
  merged.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
  const withImages = merged.filter(p => p.image_url);

  res.json({ success: true, data: withImages.slice(0, limit) });
}));

// POST /api/fb-posts/sync - مزامنة يدوية
router.post('/sync', asyncHandler(async (req, res) => {
  const { syncNewPosts } = require('../services/fbSync');
  const result = await syncNewPosts();
  res.json({ success: true, data: result });
}));

// GET /api/fb-posts/:id - single post (CMS version takes priority)
router.get('/:id', asyncHandler(async (req, res) => {
  const post = await FbPost.findById(req.params.id).lean();
  
  if (post) {
    // Check if there's a CMS override
    const cmsVersion = await News.findOne({ 
      fbPostId: post.fb_post_id, 
      isArchived: { $ne: true } 
    }).lean();
    
    if (cmsVersion) {
      return res.json({ success: true, data: newsToFbPost(cmsVersion) });
    }
    return res.json({ success: true, data: post });
  }

  // Maybe it's a CMS News _id (for manually created or imported items)
  const cmsPost = await News.findById(req.params.id).lean();
  if (cmsPost && !cmsPost.isArchived) {
    return res.json({ success: true, data: newsToFbPost(cmsPost) });
  }

  return res.status(404).json({ success: false, message: 'الخبر غير موجود' });
}));

module.exports = router;
