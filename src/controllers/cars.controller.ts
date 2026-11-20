import fs from 'fs/promises';

import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { fetchStockCarImage } from '../lib/carimage';
import { createId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { carUploadsDir, ensureDir, photoAbsolutePath, photoPublicUrl } from '../lib/uploads';
import { HttpError } from '../middleware/error';

const createCarSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  vin: z.string().min(11).max(17).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  color: z.string().min(1).optional(),
  nickname: z.string().min(1).optional(),
  mileage: z.coerce.number().int().min(0),
});

const updateCarSchema = z
  .object({
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    color: z.union([z.string().trim().min(1), z.null()]).optional(),
    nickname: z.union([z.string().trim().min(1), z.null()]).optional(),
    mileage: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export async function listCars(req: Request, res: Response, next: NextFunction) {
  try {
    const cars = await prisma.car.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ cars });
  } catch (err) {
    next(err);
  }
}

export async function createCar(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createCarSchema.parse(req.body);
    const car = await prisma.car.create({
      data: {
        make: data.make,
        model: data.model,
        vin: data.vin?.toUpperCase(),
        year: data.year,
        color: data.color,
        nickname: data.nickname,
        mileage: data.mileage,
        userId: req.user!.id,
      },
    });

    let photos: Array<{
      id: string;
      carId: string;
      caption: string | null;
      mimeType: string;
      size: number;
      originalName: string | null;
      url: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    if (car.year != null) {
      const stock = await fetchStockCarImage({
        make: car.make,
        model: car.model,
        year: car.year,
        color: car.color,
      });

      if (stock) {
        const filename = `${createId()}${stock.extension}`;
        ensureDir(carUploadsDir(car.id));
        await fs.writeFile(photoAbsolutePath(car.id, filename), stock.buffer);

        const photo = await prisma.carPhoto.create({
          data: {
            carId: car.id,
            filename,
            originalName: `${car.year}-${car.make}-${car.model}${stock.extension}`,
            mimeType: stock.mimeType,
            size: stock.buffer.length,
            caption: 'Stock preview',
          },
        });

        photos = [
          {
            id: photo.id,
            carId: photo.carId,
            caption: photo.caption,
            mimeType: photo.mimeType,
            size: photo.size,
            originalName: photo.originalName,
            url: photoPublicUrl(photo.carId, photo.filename),
            createdAt: photo.createdAt,
            updatedAt: photo.updatedAt,
          },
        ];
      }
    }

    res.status(201).json({ car, photos });
  } catch (err) {
    next(err);
  }
}

export async function getCar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const found = await prisma.car.findFirst({
      where: { id, userId: req.user!.id },
      include: {
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!found) {
      throw new HttpError(404, 'Car not found');
    }

    const { photos, ...car } = found;

    res.json({
      car,
      photos: photos.map((photo) => ({
        id: photo.id,
        carId: photo.carId,
        caption: photo.caption,
        mimeType: photo.mimeType,
        size: photo.size,
        originalName: photo.originalName,
        url: photoPublicUrl(photo.carId, photo.filename),
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const data = updateCarSchema.parse(req.body);
    const existing = await prisma.car.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      throw new HttpError(404, 'Car not found');
    }

    if (
      data.mileage != null &&
      existing.mileage != null &&
      data.mileage < existing.mileage
    ) {
      throw new HttpError(400, 'Mileage cannot be less than the current value');
    }

    const car = await prisma.car.update({
      where: { id: existing.id },
      data,
    });

    res.json({ car });
  } catch (err) {
    next(err);
  }
}

export async function deleteCar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const existing = await prisma.car.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      throw new HttpError(404, 'Car not found');
    }

    await prisma.car.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
