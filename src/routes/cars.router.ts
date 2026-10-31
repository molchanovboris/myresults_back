import { Router } from 'express';

import { createCar, deleteCar, getCar, listCars, updateCar } from '../controllers/cars.controller';
import { requireAuth } from '../middleware/auth';
import { photosRouter } from './photos.router';
import { servicesRouter } from './services.router';

export const carsRouter = Router();

carsRouter.use(requireAuth);
carsRouter.get('/', listCars);
carsRouter.post('/', createCar);
carsRouter.use('/:carId/services', servicesRouter);
carsRouter.use('/:carId/photos', photosRouter);
carsRouter.get('/:id', getCar);
carsRouter.patch('/:id', updateCar);
carsRouter.delete('/:id', deleteCar);
