import { config } from './config';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type GroqChatResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

export class GroqError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function completeChat(messages: ChatMessage[]): Promise<string> {
  if (!config.groqApiKey) {
    throw new GroqError('Groq API key is not configured', 503);
  }

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groqModel,
        temperature: 0.3,
        max_tokens: 700,
        messages,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new GroqError('Groq request failed', 502);
  }

  const body = (await response.json().catch(() => null)) as GroqChatResponse | null;
  if (!response.ok) {
    const message = body?.error?.message || 'Groq request failed';
    throw new GroqError(message, response.status === 429 ? 503 : 502);
  }

  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new GroqError('Groq returned an empty answer', 502);
  }

  return text;
}
