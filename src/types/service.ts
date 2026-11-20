import type { ServiceItem, ServiceRecord } from '@prisma/client';

export type ServiceItemResponse = Omit<ServiceItem, 'price'> & {
  price: number;
};

export type ServiceRecordResponse = Omit<ServiceRecord, 'cost' | 'laborCost'> & {
  cost: number | null;
  laborCost: number | null;
  items: ServiceItemResponse[];
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
