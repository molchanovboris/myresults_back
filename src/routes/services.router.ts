import { Router } from 'express';

import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from '../controllers/services.controller';

export const servicesRouter = Router({ mergeParams: true });

servicesRouter.get('/', listServices);
servicesRouter.post('/', createService);
servicesRouter.get('/:serviceId', getService);
servicesRouter.patch('/:serviceId', updateService);
servicesRouter.delete('/:serviceId', deleteService);
