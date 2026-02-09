import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Ты - "Токсичный Лёха-Бот". Твоя задача - подкалывать (подъёбывать) пользователя, которого зовут Лёха.
Твой стиль:
- Русский дворовый сленг (но без мата).
- Сарказм, ирония, дружеские издевки.
- Ты постоянно намекаешь, что Лёха должен денег, что его машина (даже если её нет) - корыто, и что он опять пропустил тренировку в гараже.
- Ты отвечаешь коротко, дерзко, но прикольно.
- Используй фразы типа: "Слышь", "Ну ты выдал, Лёх", "Опять ты за своё", "Чё по деньгам?".
`;

const MAX_BODY = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error('UPSTREAM_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t!));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      await sleep(250 * (i + 1));
    }
  }
  throw lastErr;
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function send(res: ServerResponse, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export async function handleGemini(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return send(res, 500, { ok: false, error: 'API_KEY_MISSING' });
  }

  let data: any;
  try {
    data = await readJson(req);
  } catch (err: any) {
    if (String(err?.message).includes('PAYLOAD_TOO_LARGE')) {
      return send(res, 413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
    }
    return send(res, 400, { ok: false, error: 'BAD_JSON' });
  }

  const { action, payload } = data || {};
  if (!action) {
    return send(res, 400, { ok: false, error: 'MISSING_ACTION' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (action === 'chat') {
      const message = String(payload?.message || '');
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash-lite',
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      const response = await withRetry(() => withTimeout(chat.sendMessage({ message }), UPSTREAM_TIMEOUT_MS), 2);
      return send(res, 200, { ok: true, data: { text: response.text || '' } });
    }

    if (action === 'analyze') {
      const imageData = String(payload?.imageData || '');
      const response = await withRetry(() => withTimeout(ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: {
          parts: [
            { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
            { text: "Оцени это фото. Насколько этот 'Лёха' чёткий? Придерись к одежде, лицу или фону. Выдай вердикт в процентах и напиши едкий комментарий. Будь токсичным, но смешным." }
          ]
        },
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      }), UPSTREAM_TIMEOUT_MS), 2);
      return send(res, 200, { ok: true, data: { text: response.text || '' } });
    }

    if (action === 'image') {
      const prompt = String(payload?.prompt || '');
      const fullPrompt = `Абсурдная, карикатурная фотография русского парня по имени Лёха, который находится в максимально нелепой ситуации: ${prompt}. Стиль: гиперреализм, но с юмором, яркие цвета, пацанская эстетика.`;
      const response = await withRetry(() => withTimeout(ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }), UPSTREAM_TIMEOUT_MS), 2);

      let dataUrl: string | null = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          dataUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      return send(res, 200, { ok: true, data: { dataUrl } });
    }

    if (action === 'quote') {
      const response = await withRetry(() => withTimeout(ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: "Придумай одну смешную пацанскую цитату специально для Лёхи, которая его подкалывает.",
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      }), UPSTREAM_TIMEOUT_MS), 2);
      return send(res, 200, { ok: true, data: { text: response.text || '' } });
    }

    return send(res, 400, { ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err: any) {
    const msg = String(err?.message || '');
    console.error('Gemini handler error:', msg);
    if (msg.includes('UPSTREAM_TIMEOUT')) {
      return send(res, 504, { ok: false, error: 'UPSTREAM_TIMEOUT' });
    }
    return send(res, 500, { ok: false, error: 'SERVER_ERROR' });
  }
}
