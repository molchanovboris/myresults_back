import { Router } from 'express';

import { createCar, deleteCar, getCar, listCars, updateCar } from '../controllers/cars.controller';
import { requireAuth } from '../middleware/auth';

export const carsRouter = Router();

carsRouter.use(requireAuth);
carsRouter.get('/', listCars);
carsRouter.post('/', createCar);
carsRouter.get('/:id', getCar);
carsRouter.patch('/:id', updateCar);
carsRouter.delete('/:id', deleteCar);
