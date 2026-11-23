import type { ServiceItem, ServiceRecord } from '@prisma/client';

export type ServiceItemResponse = Omit<ServiceItem, 'price'> & {
  price: number;
};

export type ServiceInvoiceResponse = {
  id: string;
  serviceId: string;
  url: string;
  mimeType: string;
  size: number;
  originalName: string | null;
  createdAt: Date;
};

export type ServiceRecordResponse = Omit<ServiceRecord, 'cost' | 'laborCost'> & {
  cost: number | null;
  laborCost: number | null;
  items: ServiceItemResponse[];
  invoices: ServiceInvoiceResponse[];
};

export type ServiceSummary = Pick<
  ServiceRecord,
  'id' | 'status' | 'title' | 'kind' | 'recommendedMileage' | 'mileage' | 'performedAt'
> & {
  cost: number | null;
};

export type ServiceListResponse = {
  services: ServiceSummary[];
  totalCost: number;
  latestMileage: number | null;
};

export type ServiceDetailsResponse = {
  service: ServiceRecordResponse;
};

export type ServiceResponse = {
  service: ServiceRecord;
};
