const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./models');
const { initializeAdmin } = require('./middleware/auth');
const { responseHandler } = require('./middleware/responseHandler');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const newsRouter = require('./routes/news');
const { startNewsJob } = require('./jobs/newsJob');
const { startBackupScheduler } = require('./jobs/backupScheduler');
const { initializeFTAdmin } = require('./middleware/familyTreeAuth');
const treeCache = require('./services/treeCache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// TRUST PROXY - Required for Render/Heroku deployment
// Must be set BEFORE any rate-limiting middleware
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// BOT & SCAN BLOCKER - Drop common attack/scan requests early
// This saves CPU cycles by rejecting these requests immediately
// ============================================================
const botBlocker = (req, res, next) => {
  const blockedPaths = [
    '/wp-admin', '/wp-login', '/wp-content', '/wp-includes',
    '/wordpress', '/phpmyadmin', '/pma', '/admin.php',
    '/.env', '/.git', '/.htaccess', '/config.php',
    '/xmlrpc.php', '/eval-stdin.php', '/shell',
    '/cgi-bin', '/.well-known/security.txt'
  ];

  const blockedExtensions = ['.php', '.asp', '.aspx', '.jsp', '.cgi'];

  const requestPath = req.path.toLowerCase();

  // Check blocked paths
  if (blockedPaths.some(blocked => requestPath.startsWith(blocked))) {
    return res.status(404).send('Not Found');
  }

  // Check blocked extensions
  if (blockedExtensions.some(ext => requestPath.endsWith(ext))) {
    return res.status(404).send('Not Found');
  }

  next();
};

// Apply bot blocker as first middleware
app.use(botBlocker);

// ============================================================
// LOG ANALYZER INTEGRATION (OPTIONAL / SAFE MODE)
// Safely import and use the log adapter if available
// ============================================================
try {
  const logAdapter = require('./utils/logAnalyzerAdapter');
  // Log all API requests (skip static files and health checks)
  app.use(logAdapter.middleware({
    logLevel: 'info',
    skipPaths: ['/api/health', '/uploads', '/static', '/favicon.ico']
  }));
  console.log('Log Analyzer integration enabled');
} catch (e) {
  // Silently fail if adapter is missing - do not break the app
  console.warn('Log Analyzer adapter not found or failed to load (running in safe mode)');
}


// Connect to MongoDB Atlas
connectDB().then(async () => {
  // Initialize CMS admin user after DB connection
  initializeAdmin();

  // Initialize Family Tree admin (SEPARATE from CMS)
  initializeFTAdmin();

  // Start backup scheduler after DB connection
  startBackupScheduler();

  // Pre-warm the family tree cache for instant first load
  // Using memory-efficient mode
  await treeCache.warmUp();
});

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { success: false, message: 'تم تجاوز الحد المسموح من الطلبات، حاول مرة أخرى لاحقاً' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes per IP
  message: { success: false, message: 'محاولات تسجيل دخول كثيرة. يرجى المحاولة بعد 15 دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));

// Configure CORS properly for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://alshaerf.com',
      'https://www.alshaerf.com',
      'https://alshaerfamily.onrender.com',
      process.env.CORS_ORIGIN, // Allow custom origin from env
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000'
    ].filter(Boolean); // Remove undefined/null values

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Response handler middleware
app.use(responseHandler);

// Request logging middleware
app.use(logger.request);

// Handle preflight requests
app.options('*', cors(corsOptions));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: process.env.MONGODB_URI ? 'Configured' : 'Not Configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Storage status (for quick runtime checks)
app.get('/api/storage/status', (req, res) => {
  try {
    const { isCloudinaryConfigured } = require('./config/storage');
    res.json({
      storage: isCloudinaryConfigured ? 'cloudinary' : 'local',
      cloud_name: isCloudinaryConfigured ? process.env.CLOUDINARY_CLOUD_NAME : null
    });
  } catch (e) {
    res.status(500).json({ error: 'storage status error', details: String(e) });
  }
});



// API Routes
app.use('/api/news', newsRouter);
app.use('/api/persons', require('./routes/persons'));
app.use('/api/branches', require('./routes/branches')); // NEW: Safe, scalable branch-based API
app.use('/api/family-tree-content', require('./routes/familyTreeContent'));
app.use('/api/dev-team', require('./routes/devTeam'));
app.use('/api', require('./routes/api'));
// Apply strict rate limiting to login endpoint
app.use('/api/admin/login', authLimiter);
app.use('/api/admin', require('./routes/adminMongo'));

// Separate Dashboard Routes
// CMS Dashboard (uses CMS auth - JWT_SECRET)
app.use('/api/dashboard/cms', require('./routes/cmsDashboard'));

// ===== FAMILY TREE ISOLATED SYSTEM =====
// Family Tree Auth (SEPARATE from CMS - uses FAMILY_TREE_JWT_SECRET)
app.use('/api/family-tree-auth', require('./routes/familyTreeAuth'));
// Family Tree Dashboard (uses FT auth - completely isolated)
app.use('/api/dashboard/family-tree', require('./routes/familyTreeDashboard'));

// Family Tree Forum
app.use('/api/forum-auth', require('./routes/forumAuth'));
app.use('/api/forum-admin', require('./routes/forumAdmin'));
app.use('/api/forum', require('./routes/forum'));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`خادم عائلة الشاعر يعمل على المنفذ ${PORT}`);
  startNewsJob().catch(error => {
    console.error('[news-job] Failed to start:', error.message);
  });
});

// Log storage mode
try {
  const { isCloudinaryConfigured } = require('./config/storage');
  console.log(`Storage mode: ${isCloudinaryConfigured ? 'Cloudinary' : 'Local (dev only)'}`);
} catch (e) {
  console.warn('Storage status check failed:', e);
}


