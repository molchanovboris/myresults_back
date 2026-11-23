import { Router } from 'express';

import {
  createService,
  createServiceInvoice,
  deleteService,
  deleteServiceInvoice,
  getService,
  listServices,
  updateService,
} from '../controllers/services.controller';
import { handleServiceInvoiceUpload } from '../middleware/upload';

export const servicesRouter = Router({ mergeParams: true });

servicesRouter.get('/', listServices);
servicesRouter.post('/', createService);
servicesRouter.post('/:serviceId/invoices', handleServiceInvoiceUpload, createServiceInvoice);
servicesRouter.delete('/:serviceId/invoices/:invoiceId', deleteServiceInvoice);
servicesRouter.get('/:serviceId', getService);
servicesRouter.patch('/:serviceId', updateService);
servicesRouter.delete('/:serviceId', deleteService);
