import fs from 'fs';
import path from 'path';

import multer from 'multer';

import { config } from './config';
import { createId } from './id';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function carUploadsDir(carId: string) {
  return path.join(config.uploadsDir, 'cars', carId);
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function photoPublicUrl(carId: string, filename: string) {
  return `/uploads/cars/${carId}/${filename}`;
}

export function photoAbsolutePath(carId: string, filename: string) {
  return path.join(carUploadsDir(carId), filename);
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    // carId ставит middleware до multer через req.params
    const carId = String((_req as { params?: { carId?: string } }).params?.carId ?? 'unknown');
    const dir = carUploadsDir(carId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || mimeToExt(file.mimetype);
    cb(null, `${createId()}${ext}`);
  },
});

function mimeToExt(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    default:
      return '';
  }
}

export const uploadCarPhoto = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP and HEIC images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('photo');
