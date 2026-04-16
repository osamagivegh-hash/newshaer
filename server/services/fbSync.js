/**
 * Facebook Posts Auto-Sync Service
 * يجلب البوستات الجديدة من صفحة فيسبوك تلقائياً كل X دقائق
 */
const cron = require('node-cron');
const https = require('https');
const cloudinary = require('cloudinary').v2;
const FbPost = require('../models/FbPost');

const PAGE_ID = process.env.FB_PAGE_ID;
const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const SYNC_INTERVAL = parseInt(process.env.FB_SYNC_INTERVAL_MINUTES, 10) || 5;

// تصنيفات البوستات
const CATEGORIES = {
  "تعازي": [
    "تعزي", "تعازي", "رحمة الله", "إنا لله", "انا لله", "وفاة", "انتقل إلى رحمة",
    "انتقل الى رحمة", "الفقيد", "جنازة", "دفن", "تغمده", "فسيح جناته",
    "المرحوم", "المرحومة", "نعي", "تنعى", "ينعى", "عزاء", "العزاء",
    "مصاب", "المصاب", "فقدان", "توفي", "توفى", "راجعون", "الصبر والسلوان",
    "رحمه الله", "يرحمه", "يرحمها", "الجنازة"
  ],
  "أفراح وزواجات": [
    "أفراح", "افراح", "زفاف", "عرس", "زواج", "مبارك الزواج",
    "حفل زفاف", "دعوتكم لحضور حفل", "حفل", "عقد قران",
    "خطوبة", "مباركة", "ألف مبروك", "الف مبروك", "تهنئة بالزواج"
  ],
  "صلح وجاهات واحتفالات وفعاليات": [
    "صلح", "جاهة", "جاهه", "احتفال", "احتفالات", "فعالية", "فعاليات",
    "مهرجان", "تكريم", "مصالحة", "وفد", "استقبال", "ضيافة",
    "مبادرة", "مؤتمر", "ندوة", "لقاء", "اجتماع", "تجمع"
  ],
  "مواليد": [
    "مولود", "مولودة", "مبارك المولود", "مبارك المولودة",
    "رزق بـ", "رزق ب", "بالمولود", "بالمولودة", "مبروك المولود",
    "أنجب", "انجب", "ولادة", "حمد الله على السلامة"
  ],
  "إعلانات": [
    "إعلان", "اعلان", "تنويه", "هام", "عاجل", "بيان",
    "تحذير", "تذكير", "معلومات هامة", "يرجى", "نعلن",
    "نود إعلامكم", "نود اعلامكم", "للتواصل", "رقم الهاتف"
  ]
};

const WEAK_TAZAZI = new Set(["راجعون", "المرحوم", "المرحومة", "رحمه الله", "رحمة الله", "توفي", "توفى", "مصاب", "المصاب"]);

function classifyPost(message) {
  if (!message) return "أخبار عامة";
  const msg = message.toLowerCase();
  const firstPart = msg.slice(0, 250);

  // جمع كل التطابقات
  const matches = {};
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    const matched = keywords.filter(kw => msg.includes(kw));
    if (matched.length > 0) matches[category] = matched;
  }

  if (Object.keys(matches).length === 0) return "أخبار عامة";
  if (Object.keys(matches).length === 1) return Object.keys(matches)[0];

  // قواعد سياقية
  const rules = [
    ["صلح وجاهات واحتفالات وفعاليات", ["صلح", "جاهة", "جاهه", "مصالحة"]],
    ["أفراح وزواجات", ["أفراح", "افراح", "زفاف", "عرس", "زواج", "عقد قران", "حفل زفاف"]],
    ["مواليد", ["مولود", "مولودة", "رزق بـ", "رزق ب", "بالمولود", "بالمولودة", "ولادة"]],
    ["إعلانات", ["بيان", "تنويه", "عاجل", "إعلان", "اعلان", "نعلن", "مناشدة"]]
  ];

  for (const [cat, earlyKws] of rules) {
    if (matches[cat] && earlyKws.some(kw => firstPart.includes(kw))) {
      return cat;
    }
  }

  // تعازي: فقط إذا كلمات قوية
  if (matches["تعازي"]) {
    const tazaziWords = new Set(matches["تعازي"]);
    const weakOnly = [...tazaziWords].every(w => WEAK_TAZAZI.has(w));

    if (weakOnly && Object.keys(matches).length > 1) {
      const others = Object.entries(matches).filter(([k]) => k !== "تعازي");
      let best = others[0][0];
      let bestScore = 0;
      for (const [c, kws] of others) {
        const score = kws.filter(kw => firstPart.includes(kw)).length * 3 + kws.length;
        if (score > bestScore) { bestScore = score; best = c; }
      }
      return best;
    }

    if (matches["أفراح وزواجات"] && matches["أفراح وزواجات"].some(kw => firstPart.includes(kw))) {
      return "أفراح وزواجات";
    }

    return "تعازي";
  }

  // Fallback
  let best = Object.keys(matches)[0];
  let bestScore = 0;
  for (const [c, kws] of Object.entries(matches)) {
    const score = kws.filter(kw => firstPart.includes(kw)).length * 3 + kws.length;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

async function uploadImageToCloudinary(imageUrl, postId) {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'alshaer_posts',
      public_id: postId.replace(/\//g, '_'),
      overwrite: false,
      resource_type: 'image',
      transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }]
    });
    return result.secure_url;
  } catch (err) {
    // إذا الصورة موجودة مسبقاً
    if (err.http_code === 409 || (err.message && err.message.includes('already exists'))) {
      const publicId = `alshaer_posts/${postId.replace(/\//g, '_')}`;
      try {
        const info = await cloudinary.api.resource(publicId);
        return info.secure_url;
      } catch { /* ignore */ }
    }
    console.error(`[fb-sync] فشل رفع صورة ${postId}:`, err.message);
    return imageUrl; // استخدم الرابط الأصلي كـ fallback
  }
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

async function syncNewPosts() {
  if (!PAGE_ID || !ACCESS_TOKEN) {
    console.log('[fb-sync] ⚠️ متغيرات Facebook غير مُعدّة (FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN)');
    return { synced: 0, error: 'missing config' };
  }

  try {
    // جلب آخر بوست محفوظ لمعرفة التاريخ
    const lastPost = await FbPost.findOne().sort({ created_time: -1 }).lean();
    const sinceDate = lastPost
      ? new Date(lastPost.created_time).toISOString()
      : null;

    console.log(`[fb-sync] 🔄 جاري البحث عن بوستات جديدة${sinceDate ? ` بعد ${sinceDate}` : ''}...`);

    // جلب البوستات من Facebook
    const queryParams = new URLSearchParams({
      access_token: ACCESS_TOKEN,
      fields: 'id,message,created_time,full_picture,permalink_url',
      limit: '50'
    });
    if (sinceDate) {
      queryParams.set('since', String(Math.floor(new Date(sinceDate).getTime() / 1000)));
    }

    const apiUrl = `https://graph.facebook.com/v25.0/${PAGE_ID}/posts?${queryParams.toString()}`;
    const data = await httpsGet(apiUrl);

    if (data.error) {
      console.error('[fb-sync] ❌ خطأ Facebook API:', data.error.message);
      return { synced: 0, error: data.error.message };
    }

    const posts = data.data || [];
    if (posts.length === 0) {
      console.log('[fb-sync] ✅ لا توجد بوستات جديدة');
      return { synced: 0 };
    }

    // فلترة البوستات الموجودة مسبقاً
    const fbIds = posts.map(p => p.id);
    const existing = await FbPost.find({ fb_post_id: { $in: fbIds } }).select('fb_post_id').lean();
    const existingIds = new Set(existing.map(e => e.fb_post_id));
    const newPosts = posts.filter(p => !existingIds.has(p.id));

    if (newPosts.length === 0) {
      console.log('[fb-sync] ✅ جميع البوستات محفوظة مسبقاً');
      return { synced: 0 };
    }

    console.log(`[fb-sync] 📥 ${newPosts.length} بوست جديد، جاري المعالجة...`);

    let synced = 0;
    for (const post of newPosts) {
      try {
        let imageUrl = post.full_picture || null;

        // رفع الصورة لـ Cloudinary
        if (imageUrl) {
          imageUrl = await uploadImageToCloudinary(imageUrl, post.id);
        }

        // تصنيف البوست
        const category = classifyPost(post.message);

        await FbPost.create({
          fb_post_id: post.id,
          message: post.message || '',
          created_time: post.created_time,
          permalink_url: post.permalink_url,
          category,
          image_url: imageUrl,
          imported_at: new Date().toISOString()
        });

        synced++;
        console.log(`[fb-sync] ✅ ${post.id} → ${category}`);
      } catch (err) {
        if (err.code === 11000) {
          // duplicate - skip
        } else {
          console.error(`[fb-sync] ❌ خطأ في بوست ${post.id}:`, err.message);
        }
      }
    }

    console.log(`[fb-sync] 🎉 تم مزامنة ${synced} بوست جديد`);
    return { synced };
  } catch (err) {
    console.error('[fb-sync] ❌ خطأ عام:', err.message);
    return { synced: 0, error: err.message };
  }
}

function startFbSyncScheduler() {
  if (!PAGE_ID || !ACCESS_TOKEN) {
    console.log('[fb-sync] ⚠️ Facebook sync معطل - لا يوجد FB_PAGE_ID أو FB_PAGE_ACCESS_TOKEN');
    return;
  }

  const cronPattern = `*/${SYNC_INTERVAL} * * * *`;
  console.log(`[fb-sync] 🚀 مزامنة فيسبوك مفعّلة - كل ${SYNC_INTERVAL} دقائق`);

  // مزامنة فورية عند التشغيل
  syncNewPosts().catch(err => console.error('[fb-sync] خطأ أولي:', err.message));

  // جدولة دورية
  cron.schedule(cronPattern, () => {
    syncNewPosts().catch(err => console.error('[fb-sync] خطأ دوري:', err.message));
  });
}

module.exports = { startFbSyncScheduler, syncNewPosts };
