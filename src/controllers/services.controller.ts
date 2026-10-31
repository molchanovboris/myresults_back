import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/error';

const optionalExtras = {
  workshop: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
};

const createServiceSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('planned'),
    title: z.string().min(1),
    recommendedMileage: z.coerce.number().int().min(0),
    performedAt: z.coerce.date().optional(),
    ...optionalExtras,
  }),
  z.object({
    status: z.literal('completed'),
    title: z.string().min(1),
    recommendedMileage: z.coerce.number().int().min(0).optional(),
    performedAt: z.coerce.date(),
    mileage: z.coerce.number().int().min(0),
    cost: z.coerce.number().min(0),
    ...optionalExtras,
  }),
]);

const updateServiceSchema = z
  .object({
    status: z.enum(['planned', 'completed']).optional(),
    title: z.string().min(1).optional(),
    recommendedMileage: z.coerce.number().int().min(0).optional(),
    performedAt: z.coerce.date().optional(),
    mileage: z.coerce.number().int().min(0).optional(),
    cost: z.coerce.number().min(0).optional(),
    workshop: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'completed') {
      if (data.mileage == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mileage'],
          message: 'mileage is required when completing a service',
        });
      }
      if (data.cost == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cost'],
          message: 'cost is required when completing a service',
        });
      }
      if (data.performedAt == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['performedAt'],
          message: 'performedAt is required when completing a service',
        });
      }
    }
  });

const listQuerySchema = z.object({
  status: z.enum(['planned', 'completed', 'all']).default('all'),
});

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value != null && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

async function getOwnedCar(carId: string, userId: string) {
  const car = await prisma.car.findFirst({
    where: { id: carId, userId },
  });

  if (!car) {
    throw new HttpError(404, 'Car not found');
  }

  return car;
}

export async function listServices(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const { status } = listQuerySchema.parse(req.query);
    await getOwnedCar(carId, req.user!.id);

    const records = await prisma.serviceRecord.findMany({
      where: {
        carId,
        ...(status === 'all' ? {} : { status }),
      },
      orderBy: [{ performedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        status: true,
        title: true,
        recommendedMileage: true,
        cost: true,
        mileage: true,
        performedAt: true,
      },
    });

    const services = records.map((record) => ({
      id: record.id,
      status: record.status,
      title: record.title,
      recommendedMileage: record.recommendedMileage,
      cost: record.cost == null ? null : toNumber(record.cost),
      mileage: record.mileage,
      performedAt: record.performedAt,
    }));

    const completed = services.filter((record) => record.status === 'completed');
    const totalCost = completed.reduce((sum, record) => sum + (record.cost ?? 0), 0);
    const latestMileage = completed.at(-1)?.mileage ?? null;

    res.json({ services, totalCost, latestMileage });
  } catch (err) {
    next(err);
  }
}

export async function createService(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    await getOwnedCar(carId, req.user!.id);

    // Если status не передан — считаем planned
    const body = {
      status: 'planned',
      ...req.body,
    };
    const data = createServiceSchema.parse(body);

    if (data.status === 'completed') {
      const service = await prisma.serviceRecord.create({
        data: {
          carId,
          status: 'completed',
          title: data.title,
          recommendedMileage: data.recommendedMileage,
          performedAt: data.performedAt,
          mileage: data.mileage,
          cost: data.cost,
          workshop: data.workshop,
          category: data.category,
          notes: data.notes,
        },
      });
      res.status(201).json({ service });
      return;
    }

    const service = await prisma.serviceRecord.create({
      data: {
        carId,
        status: 'planned',
        title: data.title,
        recommendedMileage: data.recommendedMileage,
        performedAt: data.performedAt,
        workshop: data.workshop,
        category: data.category,
        notes: data.notes,
      },
    });

    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
}

export async function getService(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const serviceId = z.string().min(1).parse(req.params.serviceId);
    await getOwnedCar(carId, req.user!.id);

    const service = await prisma.serviceRecord.findFirst({
      where: { id: serviceId, carId },
    });

    if (!service) {
      throw new HttpError(404, 'Service record not found');
    }

    res.json({ service });
  } catch (err) {
    next(err);
  }
}

export async function updateService(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const serviceId = z.string().min(1).parse(req.params.serviceId);
    await getOwnedCar(carId, req.user!.id);

    const existing = await prisma.serviceRecord.findFirst({
      where: { id: serviceId, carId },
    });

    if (!existing) {
      throw new HttpError(404, 'Service record not found');
    }

    const data = updateServiceSchema.parse(req.body);

    // Закрытие плана: status → completed требует факт. поля (уже в superRefine)
    if (data.status === 'completed' || existing.status === 'completed') {
      const nextStatus = data.status ?? existing.status;
      if (nextStatus === 'completed') {
        const mileage = data.mileage ?? existing.mileage;
        const cost = data.cost ?? (existing.cost == null ? null : toNumber(existing.cost));
        const performedAt = data.performedAt ?? existing.performedAt;

        if (mileage == null || cost == null || performedAt == null) {
          throw new HttpError(
            400,
            'Completed service requires mileage, cost and performedAt'
          );
        }
      }
    }

    const service = await prisma.serviceRecord.update({
      where: { id: existing.id },
      data,
    });

    res.json({ service });
  } catch (err) {
    next(err);
  }
}

export async function deleteService(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const serviceId = z.string().min(1).parse(req.params.serviceId);
    await getOwnedCar(carId, req.user!.id);

    const existing = await prisma.serviceRecord.findFirst({
      where: { id: serviceId, carId },
    });

    if (!existing) {
      throw new HttpError(404, 'Service record not found');
    }

    await prisma.serviceRecord.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
