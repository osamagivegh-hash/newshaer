const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} imageBuffer - Image buffer
 * @param {String} folder - Folder name in Cloudinary (optional)
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadImage = async (imageBuffer, folder = 'al-shaer-family') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      // Optimize images
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        // Ensure we have a valid secure_url
        if (!result || !result.secure_url) {
          console.error('Cloudinary upload missing secure_url:', result);
          return reject(new Error('Cloudinary upload failed: missing secure_url'));
        }
        console.log('Cloudinary upload successful:', {
          public_id: result.public_id,
          url: result.secure_url,
          format: result.format
        });
        resolve(result);
      }
    ).end(imageBuffer);
  });
};

/**
 * Upload image from file path
 * @param {String} filePath - Path to image file
 * @param {String} folder - Folder name in Cloudinary (optional)
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadImageFromPath = async (filePath, folder = 'al-shaer-family') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String} Public ID
 */
const getPublicIdFromUrl = (url) => {
  try {
    // Cloudinary URLs format: https://res.cloudinary.com/CLOUD_NAME/image/upload/v1234567890/FOLDER/IMAGE.jpg
    const matches = url.match(/\/upload\/.*\/(.+)$/);
    if (matches && matches[1]) {
      // Remove version number and get public ID
      const publicId = matches[1].replace(/^v\d+\//, '');
      // Remove file extension
      return publicId.replace(/\.[^/.]+$/, '');
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  uploadImage,
  uploadImageFromPath,
  deleteImage,
  getPublicIdFromUrl,
  /**
   * Upload video to Cloudinary
   * @param {Buffer} videoBuffer - Video buffer
   * @param {String} folder - Folder name in Cloudinary (optional)
   * @returns {Promise<Object>} Upload result with URL
   */
  uploadVideo: async (videoBuffer, folder = 'al-shaer-family/videos') => {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: folder,
        resource_type: 'video',
        use_filename: true,
        unique_filename: true,
        chunk_size: 6000000 // 6MB chunks
      };

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary video upload error:', error);
            return reject(error);
          }
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary upload failed: missing secure_url'));
          }
          console.log('Cloudinary video upload successful:', {
            public_id: result.public_id,
            url: result.secure_url,
            format: result.format
          });
          resolve(result);
        }
      ).end(videoBuffer);
    });
  }
};

