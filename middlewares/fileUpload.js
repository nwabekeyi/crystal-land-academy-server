const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinaryConfig');
const crypto = require('crypto');
const path = require('path');

function createMulter() {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const uniquePublicId = crypto.randomBytes(16).toString('hex');
      const format = path.extname(file.originalname)?.slice(1) || 'png';
      return {
        folder: 'crystal-land-academy',
        public_id: uniquePublicId,
        format,
        resource_type: 'auto',
      };
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-zip-compressed',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  };

  return multer({ storage, fileFilter });
}

async function deleteFromCloudinary(imageUrls) {
  if (!imageUrls) throw new Error('Image URL(s) are required');
  const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  const extractPublicId = (url) => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').slice(2);
      return parts.join('/').replace(/\.[^/.]+$/, '');
    } catch (err) {
      throw new Error('Invalid Cloudinary URL');
    }
  };

  const deletions = urls.map(async (url) => {
    const publicId = extractPublicId(url);
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'auto', // Support PDFs and other types
    });
    return { url, result };
  });

  return Promise.all(deletions);
}

module.exports = { createMulter, deleteFromCloudinary };