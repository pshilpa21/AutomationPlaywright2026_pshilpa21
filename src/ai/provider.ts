import { env, requireAiConfiguration } from '../config/env.js';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

/** Small provider adapter for OpenAI-compatible Chat Completions APIs. */
export async function askModel(messages: ChatMessage[]): Promise<string> {
  const config = requireAiConfiguration();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(env.aiTimeoutMs),
    body: JSON.stringify({ model: config.model, temperature: 0.2, messages }),
  });

  const payload = (await response.json()) as ChatCompletionResponse;
  if (!response.ok) {
    throw new Error(`AI provider returned HTTP ${response.status}: ${payload.error?.message ?? 'request failed'}`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI provider returned no message content.');
  return content;
}

export function parseModelJson<T>(content: string, parse: (value: unknown) => T): T {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return parse(JSON.parse(trimmed) as unknown);
  } catch (error) {
    throw new Error(`AI response did not match the required JSON format: ${String(error)}`);
  }
}
