import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { uploadCarPhoto } from '../lib/uploads';
import { HttpError } from './error';

/** Multer для поля `photo` + перевод ошибок в HttpError. */
export function handleCarPhotoUpload(req: Request, res: Response, next: NextFunction) {
  uploadCarPhoto(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new HttpError(400, 'Photo is too large (max 10MB)'));
        return;
      }
      next(new HttpError(400, err.message));
      return;
    }

    if (err instanceof Error) {
      next(new HttpError(400, err.message));
      return;
    }

    next(new HttpError(400, 'Failed to upload photo'));
  });
}
