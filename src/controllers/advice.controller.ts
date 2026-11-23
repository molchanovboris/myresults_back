import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { completeChat, GroqError } from '../lib/groq';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/error';

const adviceBodySchema = z.object({
  question: z.string().trim().min(1).max(500).optional(),
});

const systemPrompt = [
  'You help a car owner plan maintenance.',
  'Use only the car and service history in the user message.',
  'Say what is worth checking or replacing at the current mileage, based on that history and ordinary passenger-car practice.',
  'Do not present an interval as the manufacturer schedule.',
  'If the history is empty, say so and give only a short general check list.',
  'Answer in Russian, in a few short sentences and a short list.',
].join(' ');

export async function adviseCar(req: Request, res: Response, next: NextFunction) {
  try {
    const carId = z.string().min(1).parse(req.params.carId);
    const { question } = adviceBodySchema.parse(req.body ?? {});

    const car = await prisma.car.findFirst({
      where: { id: carId, userId: req.user!.id },
      select: { id: true, make: true, model: true, year: true, mileage: true },
    });

    if (!car) {
      throw new HttpError(404, 'Car not found');
    }

    const services = await prisma.serviceRecord.findMany({
      where: { carId: car.id },
      orderBy: [{ mileage: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 20,
      select: { title: true, kind: true, mileage: true, notes: true, performedAt: true },
    });

    const advice = await completeChat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          question: question ?? 'Что стоит проверить или заменить при текущем пробеге?',
          car: {
            make: car.make,
            model: car.model,
            year: car.year,
            mileageKm: car.mileage,
          },
          services: services.map((service) => ({
            title: service.title,
            kind: service.kind,
            mileageKm: service.mileage,
            notes: service.notes,
            performedAt: service.performedAt,
          })),
        }),
      },
    ]);

    res.json({ advice });
  } catch (err) {
    if (err instanceof GroqError) {
      next(new HttpError(err.status, err.message));
      return;
    }
    next(err);
  }
}
