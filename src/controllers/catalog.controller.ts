import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { decodeVin, getMakes, getModels } from '../lib/nhtsa';

const modelsQuerySchema = z.object({
  make: z.string().min(1),
});

export async function listMakes(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getMakes();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listModels(req: Request, res: Response, next: NextFunction) {
  try {
    const { make } = modelsQuerySchema.parse(req.query);
    const data = await getModels(make);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function decode(req: Request, res: Response, next: NextFunction) {
  try {
    const vin = z.string().min(5).max(17).parse(req.params.vin);
    const data = await decodeVin(vin);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
