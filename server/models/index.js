const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✓ MongoDB Atlas متصل: ${conn.connection.host}`);
    console.log(`✓ قاعدة البيانات: ${conn.connection.name}`);
  } catch (error) {
    console.error('خطأ في الاتصال بـ MongoDB Atlas:', error);
    process.exit(1);
  }
};

// Admin Schema with Role-Based Access Control
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['super-admin', 'admin', 'editor'],
    default: 'admin'
  },
  // Permissions for editor role
  permissions: [{
    type: String,
    enum: ['family-tree', 'dev-team', 'news', 'articles', 'conversations', 'gallery', 'contacts', 'palestine', 'settings']
  }],
  displayName: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Admin Indexes - Note: unique:true already creates indexes for username/email
// Only add additional indexes for query performance
adminSchema.index({ role: 1 });

const NEWS_CATEGORIES = ['General', 'Obituaries', 'Events', 'Celebrations', 'Other'];

// News Schema
const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  headline: { type: String },
  content: { type: String, required: true },
  summary: { type: String },
  author: { type: String },
  reporter: { type: String },
  image: { type: String },
  coverImage: { type: String },
  date: { type: Date, required: true },
  tags: [{ type: String }],
  category: { type: String, enum: NEWS_CATEGORIES, default: 'General' },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  gallery: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

newsSchema.pre('save', function (next) {
  if (this.isModified('isArchived')) {
    if (this.isArchived) {
      this.archivedAt = this.archivedAt || new Date();
    } else {
      this.archivedAt = null;
    }
  }
  next();
});

newsSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || update;

  if (set.isArchived !== undefined) {
    if (set.isArchived) {
      const archivedAt = set.archivedAt || new Date();
      if (update.$set) {
        update.$set.archivedAt = archivedAt;
      } else {
        update.archivedAt = archivedAt;
      }
    } else {
      if (update.$set) {
        update.$set.archivedAt = null;
      } else {
        update.archivedAt = null;
      }
    }
    this.setUpdate(update);
  }

  next();
});

newsSchema.statics.CATEGORIES = NEWS_CATEGORIES;

// News Indexes
newsSchema.index({ date: -1 });
newsSchema.index({ title: 'text', content: 'text', summary: 'text' });
newsSchema.index({ tags: 1 });
newsSchema.index({ category: 1, isArchived: 1 });
newsSchema.index({ isArchived: 1, archivedAt: -1 });
newsSchema.index({ author: 1 });
newsSchema.index({ createdAt: -1 });

// Conversations Schema
const conversationsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  participants: [{ type: String, required: true }],
  content: { type: String, required: true },
  summary: { type: String },
  image: { type: String },
  coverImage: { type: String },
  moderator: { type: String },
  moderatorRole: { type: String },
  moderatorImage: { type: String },
  date: { type: Date, required: true },
  tags: [{ type: String }],
  gallery: [{ type: String }],
  readingTime: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Conversations Indexes
conversationsSchema.index({ date: -1 });
conversationsSchema.index({ title: 'text', content: 'text', summary: 'text' });
conversationsSchema.index({ moderator: 1 });
conversationsSchema.index({ tags: 1 });
conversationsSchema.index({ createdAt: -1 });

// Articles Schema
const articlesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  summary: { type: String },
  image: { type: String },
  coverImage: { type: String },
  authorRole: { type: String },
  authorImage: { type: String },
  date: { type: Date, required: true },
  tags: [{ type: String }],
  gallery: [{ type: String }],
  readingTime: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Articles Indexes
articlesSchema.index({ date: -1 });
articlesSchema.index({ title: 'text', content: 'text', summary: 'text' });
articlesSchema.index({ author: 1 });
articlesSchema.index({ tags: 1 });
articlesSchema.index({ createdAt: -1 });

// Palestine Schema
const palestineSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Palestine Indexes
palestineSchema.index({ createdAt: -1 });
palestineSchema.index({ title: 'text', content: 'text' });

// Gallery Schema
const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Gallery Indexes
gallerySchema.index({ createdAt: -1 });
gallerySchema.index({ title: 'text', description: 'text' });

// Contacts Schema
const contactsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  date: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Contacts Indexes
contactsSchema.index({ status: 1, date: -1 });
contactsSchema.index({ email: 1 });
contactsSchema.index({ createdAt: -1 });

// Comments Schema
const commentsSchema = new mongoose.Schema({
  contentType: {
    type: String,
    required: true,
    enum: ['article', 'news', 'conversation']
  },
  contentId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  comment: { type: String, required: true },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Comments Indexes
commentsSchema.index({ contentType: 1, contentId: 1 });
commentsSchema.index({ approved: 1, createdAt: -1 });
commentsSchema.index({ createdAt: -1 });
commentsSchema.index({ email: 1 });

// Family Ticker News Schema
const familyTickerNewsSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Family Ticker News Indexes
familyTickerNewsSchema.index({ active: 1, order: 1 });
familyTickerNewsSchema.index({ createdAt: -1 });

// Palestine Ticker News Schema (manually curated headlines)
const palestineTickerNewsSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  source: { type: String },
  url: { type: String },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Palestine Ticker News Indexes
palestineTickerNewsSchema.index({ active: 1, order: 1 });
palestineTickerNewsSchema.index({ createdAt: -1 });

// Ticker Settings Schema (for Palestine news ticker configuration)
const tickerSettingsSchema = new mongoose.Schema({
  palestineTickerEnabled: { type: Boolean, default: true },
  autoUpdateInterval: { type: Number, default: 60000 }, // in milliseconds
  maxHeadlines: { type: Number, default: 10 },
  newsApiProvider: {
    type: String,
    enum: ['gnews', 'newsapi'],
    default: 'gnews'
  },
  updatedAt: { type: Date, default: Date.now }
});

// Hero Slides Schema (for hero slider below news tickers)
const heroSlideSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  image: { type: String, required: true },
  link: { type: String },
  linkText: { type: String },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hero Slides Indexes
heroSlideSchema.index({ active: 1, order: 1 });
heroSlideSchema.index({ createdAt: -1 });

// Create Models
const Admin = mongoose.model('Admin', adminSchema);
const News = mongoose.model('News', newsSchema);
const Conversations = mongoose.model('Conversations', conversationsSchema);
const Articles = mongoose.model('Articles', articlesSchema);
const Palestine = mongoose.model('Palestine', palestineSchema);
const Gallery = mongoose.model('Gallery', gallerySchema);
const Contacts = mongoose.model('Contacts', contactsSchema);
const Comments = mongoose.model('Comments', commentsSchema);
const FamilyTickerNews = mongoose.model('FamilyTickerNews', familyTickerNewsSchema);
const PalestineTickerNews = mongoose.model('PalestineTickerNews', palestineTickerNewsSchema);
const TickerSettings = mongoose.model('TickerSettings', tickerSettingsSchema);
const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);

// Import Person model
const Person = require('./Person');

// Import Backup models
const Backup = require('./Backup');
const AuditLog = require('./AuditLog');
const BackupSettings = require('./BackupSettings');

// Import Family Tree Admin model (SEPARATE from CMS Admin)
const FamilyTreeAdmin = require('./FamilyTreeAdmin');
const Visitor = require('./Visitor');

module.exports = {
  connectDB,
  Admin,
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
  Person,
  Backup,
  AuditLog,
  BackupSettings,
  FamilyTreeAdmin,
  Visitor
};
