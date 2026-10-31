import { getCachedOrFetch } from './vehicleCache';

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

type NhtsaResult = {
  Results?: Record<string, unknown>[];
};

async function nhtsaGet(path: string): Promise<NhtsaResult> {
  const url = `${NHTSA_BASE}${path}${path.includes('?') ? '&' : '?'}format=json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NHTSA error: ${res.status}`);
  }

  return res.json() as Promise<NhtsaResult>;
}

export async function getMakes() {
  return getCachedOrFetch('makes:car', 'nhtsa', async () => {
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

  return getCachedOrFetch(key, 'nhtsa', async () => {
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
