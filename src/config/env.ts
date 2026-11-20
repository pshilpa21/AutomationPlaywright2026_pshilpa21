import 'dotenv/config';

export const env = {
  baseUrl: process.env.BASE_URL ?? `http://127.0.0.1:${process.env.JUICE_SHOP_PORT ?? '3001'}`,
  aiBaseUrl: process.env.AI_BASE_URL,
  aiApiKey: process.env.AI_API_KEY,
  aiModel: process.env.AI_MODEL,
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 60_000),
};

export function requireAiConfiguration(): { baseUrl: string; model: string; apiKey?: string } {
  if (!env.aiBaseUrl || !env.aiModel) {
    throw new Error(
      'AI is not configured. Copy .env.example to .env and set AI_BASE_URL and AI_MODEL. Add AI_API_KEY only if your provider requires it.',
    );
  }
  return { baseUrl: env.aiBaseUrl.replace(/\/$/, ''), model: env.aiModel, apiKey: env.aiApiKey };
}
