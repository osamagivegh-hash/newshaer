/**
 * Update Palestine items with real images:
 *   1. Search Wikimedia Commons for a relevant image
 *   2. Download the image buffer
 *   3. Upload to Cloudinary (al-shaer-family/palestine folder)
 *   4. Save the Cloudinary secure_url to MongoDB
 *
 * Usage:
 *   node server/scripts/updatePalestineImages.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { connectDB, Palestine } = require('../models');
const { uploadImage } = require('../utils/cloudinary');

// Curated mapping: title → Wikimedia Commons search query
const imageQueries = {
  'فلسطين.. الوطن في القلب': 'Palestine landscape olive trees',
  'القدس.. قلب فلسطين النابض': 'Dome of the Rock Jerusalem',
  'أريحا.. أقدم مدينة مأهولة في التاريخ': 'Jericho city Palestine',
  'الخليل.. مدينة الخليل إبراهيم عليه السلام': 'Cave Patriarchs Hebron',
  'نابلس.. جبل النار وعروس فلسطين': 'Nablus city panorama',
  'بيت لحم.. مهد السيد المسيح عليه السلام': 'Church Nativity Bethlehem',
  'عكا.. عصيّة على الغزاة': 'Acre old city walls sea',
  'يافا.. عروس البحر': 'Jaffa port old city',
  'حيفا.. جوهرة الكرمل': 'Haifa Bahai gardens Carmel',
  'الكوفية الفلسطينية.. رمز الهوية': 'Keffiyeh Palestinian scarf',
  'التطريز الفلسطيني.. ذاكرة مغزولة بالخيط': 'Palestinian embroidery traditional dress',
  'شجرة الزيتون.. شجرة فلسطين المباركة': 'Olive tree old Palestine',
  'المطبخ الفلسطيني.. نكهة الأرض والذاكرة': 'Maqluba Palestinian food dish',
  'الدبكة الفلسطينية.. خطوات الأرض': 'Dabke Palestinian dance folk',
  'خان يونس.. مدينة على درب القوافل': 'Khan Yunis Gaza city',
  'قلعة برقوق.. شاهد خان يونس التاريخي': 'Khan Yunis castle Barquq fortress',
  'خان يونس عبر العصور': 'Khan Yunis historical',
  'عوائل خان يونس.. نسيج اجتماعي عريق': 'Palestinian family gathering traditional',
  'اقتصاد خان يونس وزراعتها': 'Strawberry farm greenhouse agriculture',
  'حق العودة.. الحلم الذي لا يموت': 'Palestinian key return Nakba'
};

const fallbackQueries = {
  'الدبكة الفلسطينية.. خطوات الأرض': [
    'Dabke dance Levant',
    'Palestinian folk dance dabke',
    'Dabke traditional dance'
  ],
  'قلعة برقوق.. شاهد خان يونس التاريخي': [
    'Khan Yunis Castle',
    'Barquq castle Gaza',
    'Khan Yunis old fort'
  ],
  'عوائل خان يونس.. نسيج اجتماعي عريق': [
    'Palestinian family Gaza',
    'Palestinian family portrait traditional',
    'Family in Gaza'
  ]
};

/**
 * Search Wikimedia Commons and return the direct image URL (full-res or thumb)
 */
async function searchWikimediaImage(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1200&format=json&origin=*`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.query || !data.query.pages) return null;
    
    const pages = Object.values(data.query.pages)
      .filter(p => p.imageinfo && p.imageinfo[0])
      .filter(p => {
        const info = p.imageinfo[0];
        return info.mime && info.mime.startsWith('image/') && !info.mime.includes('svg') && info.width >= 400;
      })
      .sort((a, b) => (b.imageinfo[0].width || 0) - (a.imageinfo[0].width || 0));
    
    if (pages.length === 0) return null;
    const info = pages[0].imageinfo[0];
    return info.thumburl || info.url;
  } catch (err) {
    console.error(`  ⚠️ خطأ في البحث: ${err.message}`);
    return null;
  }
}

/**
 * Download an image URL and return the Buffer (with retry on 429)
 */
async function downloadImage(imageUrl, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(imageUrl);
    if (res.status === 429) {
      const wait = (i + 1) * 5000;
      console.log(`  ⏳ Rate limited, waiting ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error('Rate limited after retries');
}

async function main() {
  try {
    await connectDB();
    console.log('✅ متصل بقاعدة البيانات\n');
    
    const items = await Palestine.find({});
    console.log(`📊 عدد العناصر: ${items.length}\n`);
    
    let uploaded = 0;
    let failed = 0;
    
    for (const item of items) {
      const title = item.title;
      
      // Skip items that already have a Cloudinary URL
      if (item.image && item.image.includes('cloudinary.com')) {
        console.log(`⏭️  ${title} — لديه صورة Cloudinary بالفعل`);
        uploaded++;
        continue;
      }
      
      console.log(`🔍 ${title}`);
      
      // Step 1: Find image on Wikimedia
      const searchQuery = imageQueries[title];
      let sourceUrl = null;
      if (searchQuery) {
        sourceUrl = await searchWikimediaImage(searchQuery);
      }

      if (!sourceUrl && fallbackQueries[title]) {
        for (const q of fallbackQueries[title]) {
          sourceUrl = await searchWikimediaImage(q);
          if (sourceUrl) {
            console.log(`  ↪ تم العثور على نتيجة بديلة: ${q}`);
            break;
          }
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      if (!sourceUrl) {
        console.log(`  ❌ لم يتم العثور على صورة في ويكيميديا`);
        failed++;
        continue;
      }
      console.log(`  📥 جاري التحميل من ويكيميديا...`);
      
      try {
        // Step 2: Download image
        const imageBuffer = await downloadImage(sourceUrl);
        console.log(`  📦 حجم الصورة: ${(imageBuffer.length / 1024).toFixed(0)} KB`);
        
        // Step 3: Upload to Cloudinary
        const result = await uploadImage(imageBuffer, 'al-shaer-family/palestine');
        const cloudinaryUrl = result.secure_url;
        
        // Step 4: Update MongoDB
        item.image = cloudinaryUrl;
        await item.save();
        
        console.log(`  ✅ تم الرفع: ${cloudinaryUrl}`);
        uploaded++;
      } catch (err) {
        console.log(`  ❌ خطأ في الرفع: ${err.message}`);
        failed++;
      }
      
      // Rate limit: longer delay to avoid Wikimedia 429
      await new Promise(r => setTimeout(r, 3000));
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 النتائج النهائية:`);
    console.log(`  ✅ نجاح: ${uploaded}/${items.length}`);
    console.log(`  ❌ فشل: ${failed}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ عام:', err.message);
    process.exit(1);
  }
}

main();