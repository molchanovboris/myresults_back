import { prisma } from './prisma';

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type NhtsaResult = {
  Results?: Record<string, unknown>[];
};

async function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await prisma.vehicleCache.findUnique({ where: { key } });
  const isFresh =
    cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return cached.payload as T;
  }

  const payload = await fetcher();

  await prisma.vehicleCache.upsert({
    where: { key },
    create: { key, source: 'nhtsa', payload: payload as object, fetchedAt: new Date() },
    update: { payload: payload as object, fetchedAt: new Date() },
  });

  return payload;
}

async function nhtsaGet(path: string): Promise<NhtsaResult> {
  const url = `${NHTSA_BASE}${path}${path.includes('?') ? '&' : '?'}format=json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NHTSA error: ${res.status}`);
  }

  return res.json() as Promise<NhtsaResult>;
}

export async function getMakes() {
  return getCachedOrFetch('makes:car', async () => {
    const data = await nhtsaGet('/GetMakesForVehicleType/car');
    const makes = (data.Results ?? [])
      .map((row) => ({
        id: row.MakeId,
        name: row.MakeName,
      }))
      .filter((row) => Boolean(row.name))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    return { makes };
  });
}

export async function getModels(make: string) {
  const key = `models:${make.trim().toLowerCase()}`;

  return getCachedOrFetch(key, async () => {
    const data = await nhtsaGet(`/GetModelsForMake/${encodeURIComponent(make)}`);
    const models = (data.Results ?? [])
      .map((row) => ({
        id: row.Model_ID,
        name: row.Model_Name,
        make: row.Make_Name,
      }))
      .filter((row) => Boolean(row.name));

    return { make, models };
  });
}

export async function decodeVin(vin: string) {
  const normalized = vin.trim().toUpperCase();
  const key = `vin:${normalized}`;

  return getCachedOrFetch(key, async () => {
    const data = await nhtsaGet(`/DecodeVin/${encodeURIComponent(normalized)}`);
    const fields: Record<string, string | null> = {};

    for (const row of data.Results ?? []) {
      const variable = row.Variable;
      const value = row.Value;
      if (typeof variable === 'string' && variable.length > 0) {
        fields[variable] = typeof value === 'string' && value.length > 0 ? value : null;
      }
    }

    return {
      vin: normalized,
      make: fields.Make ?? null,
      model: fields.Model ?? null,
      year: fields['Model Year'] ? Number(fields['Model Year']) : null,
      bodyClass: fields['Body Class'] ?? null,
      vehicleType: fields['Vehicle Type'] ?? null,
      fuelType: fields['Fuel Type - Primary'] ?? null,
      driveType: fields['Drive Type'] ?? null,
      fields,
    };
  });
}
