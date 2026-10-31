import { prisma } from './prisma';

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function getCachedOrFetch<T>(
  key: string,
  source: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await prisma.vehicleCache.findUnique({ where: { key } });
  const isFresh =
    cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return cached.payload as T;
  }

  const payload = await fetcher();

  await prisma.vehicleCache.upsert({
    where: { key },
    create: { key, source, payload: payload as object, fetchedAt: new Date() },
    update: { source, payload: payload as object, fetchedAt: new Date() },
  });

  return payload;
}
