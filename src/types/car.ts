import type { Car, CarPhoto } from '@prisma/client';

export type CarPhotoResponse = Omit<CarPhoto, 'filename'> & {
  url: string;
};

export type CarListResponse = {
  cars: Car[];
};

export type CarDetailsResponse = {
  car: Car;
  photos: CarPhotoResponse[];
};

export type CarResponse = {
  car: Car;
};
