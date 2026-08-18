import { Router } from 'express';

import { decode, listMakes, listModels } from '../controllers/catalog.controller';
import { requireAuth } from '../middleware/auth';

export const catalogRouter = Router();

catalogRouter.use(requireAuth);
catalogRouter.get('/makes', listMakes);
catalogRouter.get('/models', listModels);
catalogRouter.get('/decode/:vin', decode);
