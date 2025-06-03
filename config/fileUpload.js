// multerConfig.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinaryConfig.js'; // must be the v2 instance
import crypto from 'crypto';
import path from 'path';

/**
 * Generates a Multer instance with Cloudinary Storage to handle all file formats
 * @returns {multer} Multer instance configured with Cloudinary storage in 'crystal-land-academy' folder
 */
export function createMulter() {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const uniquePublicId = crypto.randomBytes(16).toString('hex');
      const format = path.extname(file.originalname)?.slice(1) || 'png'; // remove dot

      return {
        folder: 'crystal-land-academy', // All uploads go to this folder
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

/**
 * Utility to delete Cloudinary asset(s) by secure URL(s)
 * @param {string | string[]} imageUrls - One or more secure Cloudinary URLs
 * @returns {Promise<object[]>} - Cloudinary deletion results
 */
export async function deleteFromCloudinary(imageUrls) {
  if (!imageUrls) throw new Error('Image URL(s) are required');
  const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  const extractPublicId = (url) => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').slice(2); // skip /vxxx/
      return parts.join('/').replace(/\.[^/.]+$/, ''); // strip extension
    } catch (err) {
      throw new Error('Invalid Cloudinary URL');
    }
  };

  const deletions = urls.map(async (url) => {
    const publicId = extractPublicId(url);
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
    });
    return { url, result };
  });

  return Promise.all(deletions);
}
