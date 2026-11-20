import type { Car } from '@prisma/client';

export type PublicCar = Omit<Car, 'imageFilename'>;

export type CarImageResponse = {
  url: string;
};

export type CarListResponse = {
  cars: PublicCar[];
};

export type CarDetailsResponse = {
  car: PublicCar;
  image: CarImageResponse | null;
};

export type CarResponse = {
  car: PublicCar;
  image?: CarImageResponse | null;
};
