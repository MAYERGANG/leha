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

const fallbackChats = [
  "Ну привет, Лёха. Опять пришёл за мудростью?",
  "Слышь, Лёх, ты сначала долг верни, потом вопросы.",
  "Лёха, не спеши. Я ещё думаю, как тебя поддеть.",
  "Опять ты? Ладно, давай, удиви меня.",
  "Лёха, твои аргументы, как твой авто — на честном слове.",
];

const fallbackChat = () => fallbackChats[Math.floor(Math.random() * fallbackChats.length)];

async function postGemini<T>(action: string, payload: any, onRetry?: (attempt: number) => void): Promise<T> {
  return withRetry(async () => {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    if (!res.ok) {
      throw new Error('API_ERROR');
    }
    const json = await res.json();
    if (!json?.ok) {
      throw new Error('API_ERROR');
    }
    return json.data as T;
  }, 2, onRetry);
}

export const geminiService = {
  async chat(message: string, opts?: { onRetry?: (attempt: number) => void }) {
    try {
      const data = await postGemini<{ text: string }>('chat', { message }, opts?.onRetry);
      return data.text || fallbackChat();
    } catch {
      return fallbackChat();
    }
  },

  async analyzeStyle(imageData: string, opts?: { onRetry?: (attempt: number) => void }): Promise<string> {
    try {
      const data = await postGemini<{ text: string }>('analyze', { imageData }, opts?.onRetry);
      return data.text || "Даже сканер завис от такой нечёткости, Лёх.";
    } catch {
      return "Сканер отвалился. Лёха опять что-то сломал.";
    }
  },

  async generateCrazyLekha(prompt: string, opts?: { onRetry?: (attempt: number) => void }): Promise<string | null> {
    try {
      const data = await postGemini<{ dataUrl: string | null }>('image', { prompt }, opts?.onRetry);
      return data.dataUrl || null;
    } catch {
      return null;
    }
  },

  async getLekhaQuote(opts?: { onRetry?: (attempt: number) => void }): Promise<string> {
    try {
      const data = await postGemini<{ text: string }>('quote', {}, opts?.onRetry);
      return data.text || "Лёха, ты где?";
    } catch {
      return "Цитатник умер. Лёха, походу без вдохновения.";
    }
  }
};
