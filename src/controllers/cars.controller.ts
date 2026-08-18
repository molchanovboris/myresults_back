import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/error';

const createCarSchema = z.object({
  vin: z.string().min(5).max(17).optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100).optional(),
  nickname: z.string().min(1).optional(),
});

const updateCarSchema = createCarSchema.partial();

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
        ...data,
        vin: data.vin?.toUpperCase(),
        userId: req.user!.id,
      },
    });
    res.status(201).json({ car });
  } catch (err) {
    next(err);
  }
}

export async function getCar(req: Request, res: Response, next: NextFunction) {
  try {
    const car = await prisma.car.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!car) {
      throw new HttpError(404, 'Car not found');
    }

    res.json({ car });
  } catch (err) {
    next(err);
  }
}

export async function updateCar(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateCarSchema.parse(req.body);
    const existing = await prisma.car.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      throw new HttpError(404, 'Car not found');
    }

    const car = await prisma.car.update({
      where: { id: existing.id },
      data: {
        ...data,
        vin: data.vin?.toUpperCase(),
      },
    });

    res.json({ car });
  } catch (err) {
    next(err);
  }
}

export async function deleteCar(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.car.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
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
