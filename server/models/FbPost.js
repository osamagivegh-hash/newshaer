const mongoose = require('mongoose');

const fbPostSchema = new mongoose.Schema({
  fb_post_id: { type: String, required: true, unique: true },
  message: { type: String, default: '' },
  created_time: { type: Date, required: true },
  permalink_url: { type: String },
  category: { type: String, default: 'أخبار عامة' },
  image_url: { type: String, default: null },
  imported_at: { type: Date, default: Date.now }
}, {
  collection: 'posts'
});

fbPostSchema.index({ category: 1 });
fbPostSchema.index({ created_time: -1 });

module.exports = mongoose.model('FbPost', fbPostSchema);
