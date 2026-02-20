const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Helper function to trim environment variables
const trimEnv = (v) => (typeof v === 'string' ? v.trim() : undefined);

// Read and clean environment variables
const cloudinaryCloudName = trimEnv(process.env.CLOUDINARY_CLOUD_NAME);
const cloudinaryApiKey = trimEnv(process.env.CLOUDINARY_API_KEY);
const cloudinaryApiSecret = trimEnv(process.env.CLOUDINARY_API_SECRET);
const useCloudinaryEnv = trimEnv(process.env.USE_CLOUDINARY);
const cloudinaryFolder = trimEnv(process.env.CLOUDINARY_FOLDER) || 'al-shaer-family';

// Check if Cloudinary is configured
const hasCloudinaryCredentials = !!cloudinaryCloudName && !!cloudinaryApiKey && !!cloudinaryApiSecret;
const isCloudinaryConfigured =
  hasCloudinaryCredentials &&
  useCloudinaryEnv !== 'false';

// Configure Cloudinary if available
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
  });

  console.log('✅ Cloudinary storage configured');
  console.log('Cloudinary settings:', {
    cloud_name: cloudinaryCloudName,
    api_key_loaded: !!cloudinaryApiKey,
    folder: cloudinaryFolder,
  });
} else {
  console.log('⚠️ Cloudinary disabled — using local uploads');
  if (!hasCloudinaryCredentials) {
    console.log('Reason: missing Cloudinary environment variables (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
  } else if (useCloudinaryEnv === 'false') {
    console.log('Reason: USE_CLOUDINARY is explicitly set to "false".');
  } else {
    console.log('Reason: Cloudinary credentials missing or not fully defined.');
  }
}

// Configure multer storage
// Always use memory storage so we can choose Cloudinary or local file saving
// This matches the approach in adminMongo.js
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

const multerStorage = multer.memoryStorage();

// Upload configuration
// Upload configuration
const uploadConfig = {
  storage: multerStorage,
  limits: {
    // Increase limit to 100MB for video uploads
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') ||
      [...allowedImageTypes, ...allowedVideoTypes];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. المسموح: صور (jpg, png, gif, webp) وفيديو (mp4, webm, mov)'), false);
    }
  }
};

// Create multer instance
const upload = multer(uploadConfig);

// Export everything needed
module.exports = {
  storage: multerStorage,
  upload,
  cloudinary: isCloudinaryConfigured ? cloudinary : null,
  isCloudinaryConfigured,
  cloudinaryFolder,
  uploadsDir,
  cloudinaryConfig: isCloudinaryConfigured ? {
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
  } : null,
};
