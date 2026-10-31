import { config } from './config';
import { getCachedOrFetch } from './vehicleCache';

const AUTODEV_BASE = 'https://api.auto.dev';

type AutoDevStyle = {
  name?: string;
  trim?: string;
  confidence?: number;
};

type AutoDevResponse = {
  vin?: string;
  vinValid?: boolean;
  wmi?: string;
  origin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string | null;
  style?: string | null;
  body?: string | null;
  engine?: string | null;
  drive?: string | null;
  transmission?: string | null;
  ambiguous?: boolean;
  trims?: string[];
  styles?: AutoDevStyle[];
  vehicle?: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    manufacturer?: string;
  };
  error?: string;
  message?: string;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

/** Убирает null / undefined / пустые строки и массивы из объекта. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }

  return result as Partial<T>;
}

export async function decodeVin(vin: string) {
  if (!config.autoDevApiKey) {
    throw new Error('AUTODEV_API_KEY is not configured');
  }

  const normalized = vin.trim().toUpperCase();
  const key = `autodev:vin:v2:${normalized}`;

  return getCachedOrFetch(key, 'autodev', async () => {
    const res = await fetch(`${AUTODEV_BASE}/vin/${encodeURIComponent(normalized)}`, {
      headers: {
        Authorization: `Bearer ${config.autoDevApiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Auto.dev error: ${res.status} ${body}`);
    }

    const data = (await res.json()) as AutoDevResponse;

    if (data.error || data.message) {
      if (!data.make && !data.model && !data.vehicle?.make) {
        throw new Error(data.error ?? data.message ?? 'Auto.dev decode failed');
      }
    }

    const bestStyle = Array.isArray(data.styles)
      ? [...data.styles].sort(
          (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
        )[0]
      : undefined;

    return compact({
      vin: asNonEmptyString(data.vin) ?? normalized,
      vinValid: data.vinValid ?? null,
      make: asNonEmptyString(data.make) ?? asNonEmptyString(data.vehicle?.make),
      model: asNonEmptyString(data.model) ?? asNonEmptyString(data.vehicle?.model),
      year: asOptionalNumber(data.year) ?? asOptionalNumber(data.vehicle?.year),
      engine: asNonEmptyString(data.engine),
      trim:
        asNonEmptyString(data.trim) ??
        asNonEmptyString(bestStyle?.trim) ??
        null,
      style: asNonEmptyString(data.style) ?? asNonEmptyString(bestStyle?.name),
      bodyClass: asNonEmptyString(data.body),
      driveType: asNonEmptyString(data.drive),
      transmission: asNonEmptyString(data.transmission),
      manufacturer: asNonEmptyString(data.vehicle?.manufacturer),
      origin: asNonEmptyString(data.origin),
      wmi: asNonEmptyString(data.wmi),
      ambiguous: data.ambiguous === true ? true : null,
      // Альтернативы trim, если VIN неоднозначен
      trims: Array.isArray(data.trims) && data.trims.length > 0 ? data.trims : null,
    });
  });
}
