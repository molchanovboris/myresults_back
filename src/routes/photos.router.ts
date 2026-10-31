import { Router } from 'express';

import {
  createPhoto,
  deletePhoto,
  getPhoto,
  listPhotos,
  updatePhoto,
} from '../controllers/photos.controller';
import { handleCarPhotoUpload } from '../middleware/upload';

export const photosRouter = Router({ mergeParams: true });

photosRouter.get('/', listPhotos);
photosRouter.post('/', handleCarPhotoUpload, createPhoto);
photosRouter.get('/:photoId', getPhoto);
photosRouter.patch('/:photoId', updatePhoto);
photosRouter.delete('/:photoId', deletePhoto);
