import fs from 'fs/promises';

import type { Car } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { fetchStockCarImage } from '../lib/carimage';
import { createId } from '../lib/id';
import { prisma } from '../lib/prisma';
import type { CarDetailsResponse, CarImageResponse, CarListResponse, CarResponse, PublicCar } from '../types';
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

function publicCar(car: Car): PublicCar {
  const { imageFilename: _imageFilename, ...rest } = car;
  return rest;
}

function imageResponse(car: Pick<Car, 'id' | 'imageFilename'>): CarImageResponse | null {
  return car.imageFilename ? { url: photoPublicUrl(car.id, car.imageFilename) } : null;
}

async function saveCarImage(car: {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  imageFilename: string | null;
}): Promise<CarImageResponse | null> {
  if (car.year == null) return null;

  const stock = await fetchStockCarImage({
    make: car.make,
    model: car.model,
    year: car.year,
    color: car.color,
  });
  if (!stock) return null;

  const filename = `${createId()}${stock.extension}`;
  ensureDir(carUploadsDir(car.id));
  await fs.writeFile(photoAbsolutePath(car.id, filename), stock.buffer);
  await prisma.car.update({
    where: { id: car.id },
    data: { imageFilename: filename },
  });

  if (car.imageFilename && car.imageFilename !== filename) {
    await fs.unlink(photoAbsolutePath(car.id, car.imageFilename)).catch(() => undefined);
  }

  return { url: photoPublicUrl(car.id, filename) };
}

export async function listCars(req: Request, res: Response, next: NextFunction) {
  try {
    const cars = await prisma.car.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    const body: CarListResponse = { cars: cars.map(publicCar) };
    res.json(body);
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

    const image = await saveCarImage(car);
    const stored = await prisma.car.findUniqueOrThrow({ where: { id: car.id } });
    const body: CarDetailsResponse = { car: publicCar(stored), image };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

export async function getCar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const car = await prisma.car.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!car) {
      throw new HttpError(404, 'Car not found');
    }

    const body: CarDetailsResponse = {
      car: publicCar(car),
      image: imageResponse(car),
    };
    res.json(body);
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

    const colorChanged = data.color !== undefined && data.color !== existing.color;
    const image = colorChanged ? await saveCarImage(car) : undefined;
    const body: CarResponse = image ? { car: publicCar(car), image } : { car: publicCar(car) };
    res.json(body);
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
