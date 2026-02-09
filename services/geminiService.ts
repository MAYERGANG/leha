
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const getAI = () => new GoogleGenAI({ apiKey: API_KEY });

class GeminiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, onRetry?: (attempt: number) => void) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = i === attempts - 1;
      if (isLast) break;
      onRetry?.(i + 1);
      await sleep(300 * (i + 1));
    }
  }
  throw lastErr;
}

function ensureApiKey() {
  if (!API_KEY) {
    throw new GeminiError('API_KEY_MISSING', 'Missing API key');
  }
}

const SYSTEM_INSTRUCTION = `
Ты - "Токсичный Лёха-Бот". Твоя задача - подкалывать (подъёбывать) пользователя, которого зовут Лёха.
Твой стиль:
- Русский дворовый сленг (но без мата).
- Сарказм, ирония, дружеские издевки.
- Ты постоянно намекаешь, что Лёха должен денег, что его машина (даже если её нет) - корыто, и что он опять пропустил тренировку в гараже.
- Ты отвечаешь коротко, дерзко, но прикольно.
- Используй фразы типа: "Слышь", "Ну ты выдал, Лёх", "Опять ты за своё", "Чё по деньгам?".
`;

export const geminiService = {
  async chat(message: string, opts?: { onRetry?: (attempt: number) => void }) {
    try {
      ensureApiKey();
      const ai = getAI();
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      const response = await withRetry(() => chat.sendMessage({ message }), 2, opts?.onRetry);
      return response.text;
    } catch (err) {
      if (err instanceof GeminiError) throw err;
      throw new GeminiError('NETWORK_OR_API', 'Network or API error');
    }
  },

  async analyzeStyle(imageData: string, opts?: { onRetry?: (attempt: number) => void }): Promise<string> {
    try {
      ensureApiKey();
      const ai = getAI();
      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
            { text: "Оцени это фото. Насколько этот 'Лёха' чёткий? Придерись к одежде, лицу или фону. Выдай вердикт в процентах и напиши едкий комментарий. Будь токсичным, но смешным." }
          ]
        },
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      }), 2, opts?.onRetry);
      return response.text || "Даже сканер завис от такой нечёткости, Лёх.";
    } catch {
      return "Сканер отвалился. Лёха опять что-то сломал.";
    }
  },

  async generateCrazyLekha(prompt: string, opts?: { onRetry?: (attempt: number) => void }): Promise<string | null> {
    try {
      ensureApiKey();
      const ai = getAI();
      const fullPrompt = `Абсурдная, карикатурная фотография русского парня по имени Лёха, который находится в максимально нелепой ситуации: ${prompt}. Стиль: гиперреализм, но с юмором, яркие цвета, пацанская эстетика.`;
      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }), 2, opts?.onRetry);

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async getLekhaQuote(opts?: { onRetry?: (attempt: number) => void }): Promise<string> {
    try {
      ensureApiKey();
      const ai = getAI();
      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Придумай одну смешную пацанскую цитату специально для Лёхи, которая его подкалывает.",
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      }), 2, opts?.onRetry);
      return response.text || "Лёха, ты где?";
    } catch {
      return "Цитатник умер. Лёха, походу без вдохновения.";
    }
  }
};
