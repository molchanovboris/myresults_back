import fs from 'fs/promises';

import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { photoAbsolutePath, photoPublicUrl } from '../lib/uploads';
import { HttpError } from '../middleware/error';

const captionSchema = z.object({
  caption: z.string().min(1).max(200).optional(),
});

async function getOwnedCar(carId: string, userId: string) {
  const car = await prisma.car.findFirst({
    where: { id: carId, userId },
  });

  if (!car) {
    throw new HttpError(404, 'Car not found');
  }

  return car;
}

function serializePhoto(photo: {
  id: string;
  carId: string;
  filename: string;
  originalName: string | null;
  mimeType: string;
  size: number;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: photo.id,
    carId: photo.carId,
    caption: photo.caption,
    mimeType: photo.mimeType,
    size: photo.size,
    originalName: photo.originalName,
    url: photoPublicUrl(photo.carId, photo.filename),
    createdAt: photo.createdAt,
    updatedAt: photo.updatedAt,
  };
}

export async function listPhotos(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    await getOwnedCar(carId, req.user!.id);

    const photos = await prisma.carPhoto.findMany({
      where: { carId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      photos: photos.map(serializePhoto),
      count: photos.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function createPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    await getOwnedCar(carId, req.user!.id);

    const file = req.file;
    if (!file) {
      throw new HttpError(400, 'Photo file is required (multipart field "photo")');
    }

    const { caption } = captionSchema.parse(req.body);

    const photo = await prisma.carPhoto.create({
      data: {
        carId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        caption,
      },
    });

    res.status(201).json({ photo: serializePhoto(photo) });
  } catch (err) {
    next(err);
  }
}

export async function getPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const photoId = z.string().min(1).parse(req.params.photoId);
    await getOwnedCar(carId, req.user!.id);

    const photo = await prisma.carPhoto.findFirst({
      where: { id: photoId, carId },
    });

    if (!photo) {
      throw new HttpError(404, 'Photo not found');
    }

    res.json({ photo: serializePhoto(photo) });
  } catch (err) {
    next(err);
  }
}

export async function updatePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const photoId = z.string().min(1).parse(req.params.photoId);
    await getOwnedCar(carId, req.user!.id);

    const existing = await prisma.carPhoto.findFirst({
      where: { id: photoId, carId },
    });

    if (!existing) {
      throw new HttpError(404, 'Photo not found');
    }

    const { caption } = z
      .object({ caption: z.string().min(1).max(200).nullable().optional() })
      .parse(req.body);

    const photo = await prisma.carPhoto.update({
      where: { id: existing.id },
      data: { caption: caption === undefined ? undefined : caption },
    });

    res.json({ photo: serializePhoto(photo) });
  } catch (err) {
    next(err);
  }
}

export async function deletePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const photoId = z.string().min(1).parse(req.params.photoId);
    await getOwnedCar(carId, req.user!.id);

    const existing = await prisma.carPhoto.findFirst({
      where: { id: photoId, carId },
    });

    if (!existing) {
      throw new HttpError(404, 'Photo not found');
    }

    await prisma.carPhoto.delete({ where: { id: existing.id } });

    try {
      await fs.unlink(photoAbsolutePath(carId, existing.filename));
    } catch {
      // файл мог уже отсутствовать — запись в БД важнее
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
