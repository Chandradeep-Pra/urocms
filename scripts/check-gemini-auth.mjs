import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { GoogleGenAI } from '@google/genai';

function keyType(key) {
  if (!key) return 'missing';
  if (key.startsWith('AQ.')) return 'authorization-key';
  if (key.startsWith('AIza')) return 'standard-api-key';
  if (key.startsWith('ya29.')) return 'oauth-access-token';
  if (key.startsWith('Bearer ')) return 'bearer-prefixed-value';
  if (key.startsWith('eyJ')) return 'jwt';
  return 'unrecognized';
}

const files = process.argv.slice(2).filter(arg => arg !== '--probe');
const seen = new Map();
for (const file of files) {
  if (!existsSync(file)) continue;
  const env = parseEnv(readFileSync(resolve(file), 'utf8'));
  const raw = env.GEMINI_API_KEY || '';
  const key = raw.trim();
  const sameAs = seen.get(key);
  console.log(JSON.stringify({ file, keyType: keyType(key), whitespaceTrimmed: key !== raw, sameKeyAs: sameAs || null,
    vertexCredentialsConfigured: Boolean(env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
  }));
  if (!key || sameAs) continue;
  seen.set(key, file);
  if (!process.argv.includes('--probe')) continue;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const result = await ai.models.generateContent({
      model: env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
      contents: 'Reply OK.',
      config: { maxOutputTokens: 8, thinkingConfig: { thinkingBudget: 0 }, abortSignal: AbortSignal.timeout(20_000) },
    });
    console.log(JSON.stringify({ file, probeStatus: 200, status: 'OK',
      generatedResponse: Boolean(result.candidates?.length),
    }));
  } catch (error) {
    console.log(JSON.stringify({ file, probeStatus: error.status || null, errorType: error.cause?.code || error.name }));
    process.exitCode = 1;
  }
}
