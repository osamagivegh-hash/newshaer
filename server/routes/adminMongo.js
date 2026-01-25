const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  login,
  changePassword,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword
} = require('../middleware/auth');
const {
  News,
  Conversations,
  Articles,
  Palestine,
  Gallery,
  Contacts,
  Comments,
  FamilyTickerNews,
  PalestineTickerNews,
  TickerSettings,
  HeroSlide,
  Visitor
} = require('../models');

// Import storage configuration
const { upload, isCloudinaryConfigured, cloudinaryFolder, uploadsDir } = require('../config/storage');

// Import Cloudinary utilities
const cloudinaryUtils = require('../utils/cloudinary');

const router = express.Router();

// Helper function to normalize MongoDB documents (convert _id to id)
const normalizeDocument = (doc) => {
  if (!doc) return null;
  if (Array.isArray(doc)) {
    return doc.map(item => normalizeDocument(item));
  }
  const normalized = doc.toObject ? doc.toObject() : { ...doc };
  if (normalized._id) {
    normalized.id = normalized._id.toString();
  }
  return normalized;
};

// Auth routes
router.post('/login', login);
router.post('/change-password', authenticateToken, requireAdmin, changePassword);

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {};

    // Count items in each section using MongoDB
    stats.news = await News.countDocuments();
    stats.conversations = await Conversations.countDocuments();
    stats.articles = await Articles.countDocuments();
    stats.palestine = await Palestine.countDocuments();
    stats.gallery = await Gallery.countDocuments();

    // Count contacts
    stats.contacts = await Contacts.countDocuments();
    stats.unreadContacts = await Contacts.countDocuments({ status: 'new' });

    // Count persons (family tree)
    const Person = require('../models/Person');
    stats.persons = await Person.countDocuments();

    // Count dev team messages
    try {
      const { DevTeamMessage } = require('../models/DevTeam');
      stats.devTeamMessages = await DevTeamMessage.countDocuments({ status: 'new' });
    } catch (e) {
      stats.devTeamMessages = 0;
    }

    // Count Visitors
    try {
      const today = new Date().toISOString().slice(0, 10);
      const visitorsTodayDoc = await Visitor.findOne({ date: today });
      stats.visitorsToday = visitorsTodayDoc ? visitorsTodayDoc.count : 0;

      const totalVisitorsAgg = await Visitor.aggregate([
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]);
      stats.visitorsTotal = totalVisitorsAgg.length > 0 ? totalVisitorsAgg[0].total : 0;
    } catch (e) {
      console.error('Visitor stats error:', e);
      stats.visitorsToday = 0;
      stats.visitorsTotal = 0;
    }

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'خطأ في جلب الإحصائيات' });
  }
});

// Generic CRUD operations for MongoDB collections
const createCRUDRoutes = (sectionName, Model) => {
  const mongoose = require('mongoose');

  // Helper to validate ObjectId
  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

  // GET all items
  router.get(`/${sectionName}`, authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = await Model.find().sort({ createdAt: -1 });
      res.json(normalizeDocument(data));
    } catch (error) {
      console.error(`Get ${sectionName} error:`, error);
      res.status(500).json({ message: `خطأ في جلب ${sectionName}` });
    }
  });

  // GET single item
  router.get(`/${sectionName}/:id`, authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ObjectId format
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'معرف غير صالح' });
      }

      const item = await Model.findById(id);

      if (item) {
        res.json(normalizeDocument(item));
      } else {
        res.status(404).json({ message: 'العنصر غير موجود' });
      }
    } catch (error) {
      console.error(`Get single ${sectionName} error:`, error);
      res.status(500).json({ message: `خطأ في جلب ${sectionName}` });
    }
  });

  // POST create item
  router.post(`/${sectionName}`, authenticateToken, requireAdmin, async (req, res) => {
    try {
      const newItem = new Model(req.body);
      const savedItem = await newItem.save();

      res.status(201).json({
        message: 'تم إضافة العنصر بنجاح',
        item: normalizeDocument(savedItem)
      });
    } catch (error) {
      console.error(`Create ${sectionName} error:`, error);
      res.status(500).json({ message: `خطأ في إضافة ${sectionName}` });
    }
  });

  // PUT update item
  router.put(`/${sectionName}/:id`, authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedItem = await Model.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (updatedItem) {
        res.json({
          message: 'تم تحديث العنصر بنجاح',
          item: normalizeDocument(updatedItem)
        });
      } else {
        res.status(404).json({ message: 'العنصر غير موجود' });
      }
    } catch (error) {
      console.error(`Update ${sectionName} error:`, error);
      res.status(500).json({ message: `خطأ في تحديث ${sectionName}` });
    }
  });

  // DELETE item
  router.delete(`/${sectionName}/:id`, authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deletedItem = await Model.findByIdAndDelete(id);

      if (deletedItem) {
        res.json({
          message: 'تم حذف العنصر بنجاح',
          item: deletedItem
        });
      } else {
        res.status(404).json({ message: 'العنصر غير موجود' });
      }
    } catch (error) {
      console.error(`Delete ${sectionName} error:`, error);
      res.status(500).json({ message: `خطأ في حذف ${sectionName}` });
    }
  });

  // Bulk delete
  router.post(`/bulk-delete/${sectionName}`, authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'معرفات العناصر مطلوبة' });
      }

      const result = await Model.deleteMany({ _id: { $in: ids } });

      res.json({
        message: `تم حذف ${result.deletedCount} عنصر بنجاح`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error(`Bulk delete ${sectionName} error:`, error);
      res.status(500).json({ message: 'خطأ في الحذف المجمع' });
    }
  });
};

// Create CRUD routes for all sections
createCRUDRoutes('news', News);
createCRUDRoutes('conversations', Conversations);
createCRUDRoutes('articles', Articles);
createCRUDRoutes('palestine', Palestine);
createCRUDRoutes('gallery', Gallery);

router.patch('/news/:id/archive', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived } = req.body;

    if (typeof isArchived !== 'boolean') {
      return res.status(400).json({ message: 'قيمة الأرشفة غير صالحة' });
    }

    const updated = await News.findByIdAndUpdate(
      id,
      { isArchived, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'الخبر غير موجود' });
    }

    res.json({
      message: isArchived ? 'تم نقل الخبر إلى الأرشيف' : 'تم استرجاع الخبر من الأرشيف',
      item: normalizeDocument(updated)
    });
  } catch (error) {
    console.error('Toggle news archive error:', error);
    res.status(500).json({ message: 'خطأ في تحديث حالة الأرشفة' });
  }
});

// Contact management
router.get('/contacts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contacts = await Contacts.find().sort({ date: -1 });
    res.json(normalizeDocument(contacts));
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'خطأ في جلب الرسائل' });
  }
});

router.put('/contacts/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const contact = await Contacts.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (contact) {
      res.json({ message: 'تم تحديث حالة الرسالة بنجاح' });
    } else {
      res.status(404).json({ message: 'الرسالة غير موجودة' });
    }
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({ message: 'خطأ في تحديث حالة الرسالة' });
  }
});

router.delete('/contacts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedContact = await Contacts.findByIdAndDelete(id);

    if (deletedContact) {
      res.json({
        message: 'تم حذف الرسالة بنجاح',
        contact: deletedContact
      });
    } else {
      res.status(404).json({ message: 'الرسالة غير موجودة' });
    }
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'خطأ في حذف الرسالة' });
  }
});

// File upload endpoint
router.post('/upload', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم اختيار ملف' });
    }

    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      try {
        const result = await cloudinaryUtils.uploadImage(req.file.buffer, cloudinaryFolder);

        // Validate the response
        if (!result || !result.secure_url) {
          throw new Error('Cloudinary upload returned invalid response');
        }

        // Ensure URL is complete and valid
        const imageUrl = result.secure_url;
        if (!imageUrl.startsWith('http')) {
          throw new Error(`Invalid Cloudinary URL format: ${imageUrl}`);
        }

        console.log('Image uploaded successfully:', {
          public_id: result.public_id,
          url: imageUrl,
          format: result.format
        });

        res.json({
          message: 'تم رفع الملف بنجاح إلى Cloudinary',
          filename: result.public_id,
          url: imageUrl
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        // Fallback to local storage
        await saveToLocalStorage(req, res);
      }
    } else {
      // Upload to local storage
      await saveToLocalStorage(req, res);
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'خطأ في رفع الملف' });
  }
});

// Helper function for local storage upload
const saveToLocalStorage = async (req, res) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);
  const filePath = path.join(uploadsDir, filename);

  // Write file to disk
  await fs.writeFile(filePath, req.file.buffer);

  const fileUrl = `/uploads/${filename}`;
  res.json({
    message: 'تم رفع الملف بنجاح',
    filename: filename,
    url: fileUrl
  });
};

// ==================== COMMENTS MANAGEMENT ====================

router.get('/comments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { contentType, contentId } = req.query;
    const query = {};
    if (contentType) query.contentType = contentType;
    if (contentId) query.contentId = contentId;

    const comments = await Comments.find(query).sort({ createdAt: -1 });
    res.json(normalizeDocument(comments));
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'خطأ في جلب التعليقات' });
  }
});

router.delete('/comments/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedComment = await Comments.findByIdAndDelete(id);
    if (!deletedComment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    res.json({ message: 'تم حذف التعليق بنجاح', id });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'خطأ في حذف التعليق' });
  }
});

// ==================== FAMILY TICKER NEWS CRUD ====================

// GET all family ticker news items
router.get('/family-ticker-news', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const items = await FamilyTickerNews.find().sort({ order: 1, createdAt: -1 });
    res.json(normalizeDocument(items));
  } catch (error) {
    console.error('Get family ticker news error:', error);
    res.status(500).json({ message: 'خطأ في جلب أخبار الشريط العائلي' });
  }
});

// GET active family ticker news items (for public API)
router.get('/family-ticker-news/active', async (req, res) => {
  try {
    const items = await FamilyTickerNews.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .select('headline');

    const headlines = items.map(item => item.headline);
    res.json(headlines);
  } catch (error) {
    console.error('Get active family ticker news error:', error);
    res.status(500).json({ message: 'خطأ في جلب أخبار الشريط العائلي' });
  }
});

// GET single family ticker news item
router.get('/family-ticker-news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await FamilyTickerNews.findById(id);

    if (!item) {
      return res.status(404).json({ message: 'عنصر الشريط غير موجود' });
    }

    res.json(normalizeDocument(item));
  } catch (error) {
    console.error('Get family ticker news item error:', error);
    res.status(500).json({ message: 'خطأ في جلب عنصر الشريط' });
  }
});

// POST create new family ticker news item
router.post('/family-ticker-news', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { headline, active, order } = req.body;

    if (!headline || headline.trim() === '') {
      return res.status(400).json({ message: 'العنوان مطلوب' });
    }

    const newItem = new FamilyTickerNews({
      headline: headline.trim(),
      active: active !== undefined ? active : true,
      order: order || 0
    });

    const savedItem = await newItem.save();
    res.status(201).json(normalizeDocument(savedItem));
  } catch (error) {
    console.error('Create family ticker news error:', error);
    res.status(500).json({ message: 'خطأ في إضافة عنصر الشريط' });
  }
});

// PUT update family ticker news item
router.put('/family-ticker-news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { headline, active, order } = req.body;

    const item = await FamilyTickerNews.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'عنصر الشريط غير موجود' });
    }

    if (headline !== undefined) item.headline = headline.trim();
    if (active !== undefined) item.active = active;
    if (order !== undefined) item.order = order;
    item.updatedAt = new Date();

    const updatedItem = await item.save();
    res.json(normalizeDocument(updatedItem));
  } catch (error) {
    console.error('Update family ticker news error:', error);
    res.status(500).json({ message: 'خطأ في تحديث عنصر الشريط' });
  }
});

// DELETE family ticker news item
router.delete('/family-ticker-news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await FamilyTickerNews.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ message: 'عنصر الشريط غير موجود' });
    }

    res.json({ message: 'تم حذف عنصر الشريط بنجاح' });
  } catch (error) {
    console.error('Delete family ticker news error:', error);
    res.status(500).json({ message: 'خطأ في حذف عنصر الشريط' });
  }
});

// ==================== PALESTINE TICKER NEWS CRUD ====================

// GET all Palestine ticker news items
router.get('/palestine-ticker-news', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const items = await PalestineTickerNews.find().sort({ order: 1, createdAt: -1 });
    res.json(normalizeDocument(items));
  } catch (error) {
    console.error('Get Palestine ticker news error:', error);
    res.status(500).json({ message: 'خطأ في جلب أخبار شريط فلسطين' });
  }
});

// GET active Palestine ticker news items (for public API)
router.get('/palestine-ticker-news/active', async (req, res) => {
  try {
    const items = await PalestineTickerNews.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .select('headline');

    const headlines = items.map(item => item.headline);
    res.json(headlines);
  } catch (error) {
    console.error('Get active Palestine ticker news error:', error);
    res.status(500).json({ message: 'خطأ في جلب أخبار شريط فلسطين' });
  }
});

// GET single Palestine ticker news item
router.get('/palestine-ticker-news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await PalestineTickerNews.findById(id);

    if (!item) {
      return res.status(404).json({ message: 'عنصر الشريط غير موجود' });
    }

    res.json(normalizeDocument(item));
  } catch (error) {
    console.error('Get Palestine ticker news item error:', error);
    res.status(500).json({ message: 'خطأ في جلب عنصر الشريط' });
  }
});

// POST create new Palestine ticker news item
router.post('/palestine-ticker-news', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { headline, source, url, active, order } = req.body;

    const normalizedHeadline = (headline || '').toString().trim();
    if (!normalizedHeadline) {
      return res.status(400).json({ message: 'العنوان مطلوب' });
    }

    const newItem = new PalestineTickerNews({
      headline: normalizedHeadline,
      source: (source || '').toString().trim(),
      url: (url || '').toString().trim(),
      active: active !== undefined ? active : true,
      order: order || 0
    });

    const savedItem = await newItem.save();
    res.status(201).json(normalizeDocument(savedItem));
  } catch (error) {
    console.error('Create Palestine ticker news error:', error);
    res.status(500).json({ message: 'خطأ في إضافة عنصر الشريط' });
  }
});

// PUT update Palestine ticker news item
router.put('/palestine-ticker-news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { headline, source, url, active, order } = req.body;

    const item = await PalestineTickerNews.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'عنصر الشريط غير موجود' });
    }

    if (headline !== undefined) {
      const normalizedHeadline = (headline || '').toString().trim();
      if (!normalizedHeadline) {
        return res.status(400).json({ message: 'العنوان مطلوب' });
      }
      item.headline = normalizedHeadline;
    }
    if (source !== undefined) item.source = (source || '').toString().trim();
    if (url !== undefined) item.url = (url || '').toString().trim();
    if (active !== undefined) item.active = active;
    if (order !== undefined) item.order = order;
    item.updatedAt = new Date();

    const updatedItem = await item.save();
    res.json(normalizeDocument(updatedItem));
  } catch (error) {
    console.error('Update Palestine ticker news error:', error);
    res.status(500).json({ message: 'خطأ في تحديث عنصر الشريط' });
  }
});

// DELETE Palestine ticker news item
router.delete('/palestine-ticker-news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await PalestineTickerNews.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ message: 'عنصر الشريط غير موجود' });
    }

    res.json({ message: 'تم حذف عنصر الشريط بنجاح' });
  } catch (error) {
    console.error('Delete Palestine ticker news error:', error);
    res.status(500).json({ message: 'خطأ في حذف عنصر الشريط' });
  }
});

// ==================== TICKER SETTINGS ====================

// GET ticker settings
router.get('/ticker-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await TickerSettings.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = new TickerSettings();
      await settings.save();
    }

    res.json(normalizeDocument(settings));
  } catch (error) {
    console.error('Get ticker settings error:', error);
    res.status(500).json({ message: 'خطأ في جلب إعدادات الشريط' });
  }
});

// PUT update ticker settings
router.put('/ticker-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { palestineTickerEnabled, autoUpdateInterval, maxHeadlines, newsApiProvider } = req.body;

    let settings = await TickerSettings.findOne();

    if (!settings) {
      settings = new TickerSettings();
    }

    if (palestineTickerEnabled !== undefined) settings.palestineTickerEnabled = palestineTickerEnabled;
    if (autoUpdateInterval !== undefined) settings.autoUpdateInterval = autoUpdateInterval;
    if (maxHeadlines !== undefined) settings.maxHeadlines = maxHeadlines;
    if (newsApiProvider !== undefined) settings.newsApiProvider = newsApiProvider;
    settings.updatedAt = new Date();

    const updatedSettings = await settings.save();
    res.json(normalizeDocument(updatedSettings));
  } catch (error) {
    console.error('Update ticker settings error:', error);
    res.status(500).json({ message: 'خطأ في تحديث إعدادات الشريط' });
  }
});

// ==================== HERO SLIDES CRUD ====================

// GET all hero slides (admin)
router.get('/hero-slides', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: -1 });
    res.json(normalizeDocument(slides));
  } catch (error) {
    console.error('Get hero slides error:', error);
    res.status(500).json({ message: 'خطأ في جلب شرائح البطل' });
  }
});

// GET active hero slides (public API)
router.get('/hero-slides/active', async (req, res) => {
  try {
    const slides = await HeroSlide.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .select('title subtitle image link linkText order');
    res.json(normalizeDocument(slides));
  } catch (error) {
    console.error('Get active hero slides error:', error);
    res.status(500).json({ message: 'خطأ في جلب شرائح البطل' });
  }
});

// GET single hero slide
router.get('/hero-slides/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await HeroSlide.findById(id);

    if (!slide) {
      return res.status(404).json({ message: 'الشريحة غير موجودة' });
    }

    res.json(normalizeDocument(slide));
  } catch (error) {
    console.error('Get hero slide error:', error);
    res.status(500).json({ message: 'خطأ في جلب الشريحة' });
  }
});

// POST create new hero slide
router.post('/hero-slides', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, subtitle, image, link, linkText, active, order } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'العنوان مطلوب' });
    }

    if (!image || image.trim() === '') {
      return res.status(400).json({ message: 'الصورة مطلوبة' });
    }

    const newSlide = new HeroSlide({
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : '',
      image: image.trim(),
      link: link ? link.trim() : '',
      linkText: linkText ? linkText.trim() : '',
      active: active !== undefined ? active : true,
      order: order || 0
    });

    const savedSlide = await newSlide.save();
    res.status(201).json(normalizeDocument(savedSlide));
  } catch (error) {
    console.error('Create hero slide error:', error);
    res.status(500).json({ message: 'خطأ في إضافة الشريحة' });
  }
});

// PUT update hero slide
router.put('/hero-slides/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image, link, linkText, active, order } = req.body;

    const slide = await HeroSlide.findById(id);
    if (!slide) {
      return res.status(404).json({ message: 'الشريحة غير موجودة' });
    }

    if (title !== undefined) slide.title = title.trim();
    if (subtitle !== undefined) slide.subtitle = subtitle.trim();
    if (image !== undefined) slide.image = image.trim();
    if (link !== undefined) slide.link = link.trim();
    if (linkText !== undefined) slide.linkText = linkText.trim();
    if (active !== undefined) slide.active = active;
    if (order !== undefined) slide.order = order;
    slide.updatedAt = new Date();

    const updatedSlide = await slide.save();
    res.json(normalizeDocument(updatedSlide));
  } catch (error) {
    console.error('Update hero slide error:', error);
    res.status(500).json({ message: 'خطأ في تحديث الشريحة' });
  }
});

// DELETE hero slide
router.delete('/hero-slides/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await HeroSlide.findByIdAndDelete(id);

    if (!slide) {
      return res.status(404).json({ message: 'الشريحة غير موجودة' });
    }

    res.json({ message: 'تم حذف الشريحة بنجاح' });
  } catch (error) {
    console.error('Delete hero slide error:', error);
    res.status(500).json({ message: 'خطأ في حذف الشريحة' });
  }
});

// ==================== FAMILY TREE (PERSONS) ADMIN ROUTES ====================

const Person = require('../models/Person');

// Helper function to get all descendant IDs
async function getDescendantIds(personId) {
  const ids = [];
  const getChildren = async (id) => {
    const children = await Person.find({ fatherId: id }).select('_id');
    for (const child of children) {
      ids.push(child._id.toString());
      await getChildren(child._id);
    }
  };
  await getChildren(personId);
  return ids;
}

// Helper function to update descendant generations
async function updateDescendantGenerations(personId) {
  const person = await Person.findById(personId);
  if (!person) return;

  const children = await Person.find({ fatherId: personId });
  for (const child of children) {
    child.generation = person.generation + 1;
    await child.save();
    await updateDescendantGenerations(child._id);
  }
}

// Helper function to delete descendants recursively
async function deleteDescendants(personId) {
  const children = await Person.find({ fatherId: personId });
  for (const child of children) {
    await deleteDescendants(child._id);
    await Person.findByIdAndDelete(child._id);
  }
}

// GET all persons (admin view with full details)
router.get('/persons', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, generation } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } }
      ];
    }

    if (generation !== undefined && generation !== '') {
      query.generation = parseInt(generation);
    }

    const persons = await Person.find(query)
      .populate('fatherId', 'fullName')
      .sort({ generation: 1, siblingOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Person.countDocuments(query);

    res.json({
      success: true,
      data: normalizeDocument(persons),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get persons error:', error);
    res.status(500).json({ message: 'خطأ في جلب بيانات الأشخاص' });
  }
});

// GET family tree statistics for admin dashboard
router.get('/persons/stats', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const totalPersons = await Person.countDocuments();
    const totalGenerations = await Person.distinct('generation');
    const genderStats = await Person.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);
    const recentPersons = await Person.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName generation createdAt');

    res.json({
      success: true,
      data: {
        totalPersons,
        totalGenerations: totalGenerations.length,
        maxGeneration: Math.max(...totalGenerations, 0),
        genderStats: genderStats.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        recentPersons: normalizeDocument(recentPersons)
      }
    });
  } catch (error) {
    console.error('Get persons stats error:', error);
    res.status(500).json({ message: 'خطأ في جلب إحصائيات شجرة العائلة' });
  }
});

// GET single person by ID (admin)
router.get('/persons/:id', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const { id } = req.params;
    const person = await Person.findById(id)
      .populate('fatherId', 'fullName generation')
      .populate('motherId', 'fullName');

    if (!person) {
      return res.status(404).json({ message: 'الشخص غير موجود' });
    }

    // Get children count
    const childrenCount = await Person.countDocuments({ fatherId: id });

    res.json({
      success: true,
      data: {
        ...normalizeDocument(person),
        childrenCount
      }
    });
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({ message: 'خطأ في جلب بيانات الشخص' });
  }
});

// POST create new person
router.post('/persons', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const {
      fullName,
      nickname,
      fatherId,
      motherId,
      gender,
      birthDate,
      deathDate,
      isAlive,
      birthPlace,
      currentResidence,
      occupation,
      biography,
      notes,
      profileImage,
      siblingOrder,
      contact,
      verification
    } = req.body;

    // Validate required fields
    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل مطلوب'
      });
    }

    // Validate father exists if provided
    if (fatherId) {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(fatherId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف الأب غير صالح'
        });
      }

      const father = await Person.findById(fatherId);
      if (!father) {
        return res.status(400).json({
          success: false,
          message: 'الأب غير موجود في قاعدة البيانات'
        });
      }
    }

    // Check if this is the first person (root)
    const existingRoot = await Person.findOne({ isRoot: true });
    const isRoot = !fatherId && !existingRoot;

    const person = new Person({
      fullName: fullName.trim(),
      nickname: nickname?.trim(),
      fatherId: fatherId || null,
      motherId: motherId || null,
      gender: gender || 'male',
      birthDate,
      deathDate,
      isAlive: isAlive !== undefined ? isAlive : true,
      birthPlace,
      currentResidence,
      occupation,
      biography,
      notes,
      profileImage,
      siblingOrder: siblingOrder || 0,
      isRoot,
      contact,
      verification: verification || { status: 'pending' },
      createdBy: req.user.username
    });

    await person.save();

    // Populate father info for response
    await person.populate('fatherId', 'fullName');

    res.status(201).json({
      success: true,
      message: 'تمت إضافة الشخص بنجاح',
      item: normalizeDocument(person)
    });
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ message: 'خطأ في إضافة الشخص' });
  }
});

// PUT update person
router.put('/persons/:id', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'معرف غير صالح'
      });
    }

    const person = await Person.findById(id);

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'الشخص غير موجود'
      });
    }

    const {
      fullName,
      nickname,
      fatherId,
      motherId,
      gender,
      birthDate,
      deathDate,
      isAlive,
      birthPlace,
      currentResidence,
      occupation,
      biography,
      notes,
      profileImage,
      siblingOrder,
      contact,
      verification
    } = req.body;

    // Validate father if changing
    if (fatherId !== undefined && fatherId !== null) {
      if (!mongoose.Types.ObjectId.isValid(fatherId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف الأب غير صالح'
        });
      }

      // Prevent setting self as father
      if (fatherId === id) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تعيين الشخص كأب لنفسه'
        });
      }

      // Prevent circular reference (setting descendant as father)
      const descendants = await getDescendantIds(id);
      if (descendants.includes(fatherId)) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تعيين أحد الأحفاد كأب'
        });
      }

      const father = await Person.findById(fatherId);
      if (!father) {
        return res.status(400).json({
          success: false,
          message: 'الأب غير موجود في قاعدة البيانات'
        });
      }
    }

    // Update fields
    if (fullName !== undefined) person.fullName = fullName.trim();
    if (nickname !== undefined) person.nickname = nickname?.trim();
    if (fatherId !== undefined) person.fatherId = fatherId;
    if (motherId !== undefined) person.motherId = motherId;
    if (gender !== undefined) person.gender = gender;
    if (birthDate !== undefined) person.birthDate = birthDate;
    if (deathDate !== undefined) person.deathDate = deathDate;
    if (isAlive !== undefined) person.isAlive = isAlive;
    if (birthPlace !== undefined) person.birthPlace = birthPlace;
    if (currentResidence !== undefined) person.currentResidence = currentResidence;
    if (occupation !== undefined) person.occupation = occupation;
    if (biography !== undefined) person.biography = biography;
    if (notes !== undefined) person.notes = notes;
    if (profileImage !== undefined) person.profileImage = profileImage;
    if (siblingOrder !== undefined) person.siblingOrder = siblingOrder;
    if (contact !== undefined) person.contact = contact;
    if (verification !== undefined) person.verification = { ...person.verification, ...verification };

    await person.save();

    // Update descendants' generations if father changed
    if (fatherId !== undefined) {
      await updateDescendantGenerations(id);
    }

    await person.populate('fatherId', 'fullName');

    res.json({
      success: true,
      message: 'تم تحديث بيانات الشخص بنجاح',
      item: normalizeDocument(person)
    });
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ message: 'خطأ في تحديث بيانات الشخص' });
  }
});

// DELETE person
router.delete('/persons/:id', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade = false } = req.query;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'معرف غير صالح'
      });
    }

    const person = await Person.findById(id);

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'الشخص غير موجود'
      });
    }

    // Check for children
    const children = await Person.find({ fatherId: id });

    if (children.length > 0 && cascade !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف شخص لديه أبناء. استخدم cascade=true للحذف المتسلسل.',
        childrenCount: children.length,
        children: children.map(c => ({ _id: c._id, fullName: c.fullName }))
      });
    }

    if (cascade === 'true') {
      // Recursively delete all descendants
      await deleteDescendants(id);
    }

    await Person.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'تم حذف الشخص بنجاح'
    });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ message: 'خطأ في حذف الشخص' });
  }
});

// POST bulk add persons
router.post('/persons/bulk', authenticateToken, requirePermission('family-tree'), async (req, res) => {
  try {
    const { persons } = req.body;

    if (!Array.isArray(persons) || persons.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى توفير مصفوفة من الأشخاص'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const personData of persons) {
      try {
        const person = new Person({
          ...personData,
          createdBy: req.user.username
        });
        await person.save();
        results.success.push({
          fullName: person.fullName,
          _id: person._id
        });
      } catch (error) {
        results.failed.push({
          fullName: personData.fullName,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `تمت إضافة ${results.success.length} شخص، فشل ${results.failed.length}`,
      data: results
    });
  } catch (error) {
    console.error('Bulk add persons error:', error);
    res.status(500).json({ message: 'خطأ في الإضافة المجمعة' });
  }
});

// DELETE clear all persons (dangerous - requires confirmation)
router.delete('/persons/clear-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.query;

    if (confirm !== 'yes') {
      return res.status(400).json({
        success: false,
        message: 'يجب تأكيد الحذف بإضافة ?confirm=yes'
      });
    }

    const result = await Person.deleteMany({});
    res.json({
      success: true,
      message: `تم حذف جميع البيانات: ${result.deletedCount} شخص`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear all persons error:', error);
    res.status(500).json({ message: 'خطأ في حذف البيانات' });
  }
});

// ==================== USER MANAGEMENT ROUTES (Super Admin Only) ====================

/**
 * GET /api/admin/users
 * Get all users (Super Admin only)
 */
router.get('/users', authenticateToken, requireSuperAdmin, getAllUsers);

/**
 * POST /api/admin/users
 * Create a new user (Super Admin only)
 */
router.post('/users', authenticateToken, requireSuperAdmin, createUser);

/**
 * PUT /api/admin/users/:id
 * Update a user (Super Admin only)
 */
router.put('/users/:id', authenticateToken, requireSuperAdmin, updateUser);

/**
 * DELETE /api/admin/users/:id
 * Delete a user (Super Admin only)
 */
router.delete('/users/:id', authenticateToken, requireSuperAdmin, deleteUser);

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password (Super Admin only)
 */
router.post('/users/:id/reset-password', authenticateToken, requireSuperAdmin, resetUserPassword);

module.exports = router;
