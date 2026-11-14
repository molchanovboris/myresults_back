import { config } from './config';

const CAR_IMAGE_BASE = 'https://carimage.dev/api/v1';

export type StockCarImage = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

/**
 * Studio render like https://carimage.dev/playground
 * Needs make + model + year. Returns null if key missing / year absent / API error.
 */
export async function fetchStockCarImage(input: {
  make: string;
  model: string;
  year: number;
  color?: string | null;
}): Promise<StockCarImage | null> {
  if (!config.carImageApiKey) {
    return null;
  }

  const params = new URLSearchParams({
    make: input.make,
    model: input.model,
    year: String(input.year),
    view: 'front-3-4',
    format: 'webp',
    size: 'medium',
  });

  if (input.color?.trim()) {
    params.set('color', input.color.trim());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(`${CAR_IMAGE_BASE}/images/car?${params}`, {
      headers: {
        Authorization: `Bearer ${config.carImageApiKey}`,
        Accept: 'image/*',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/webp';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      return null;
    }

    return {
      buffer,
      mimeType,
      extension: mimeToExt(mimeType),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mimeToExt(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.webp';
  }
}
