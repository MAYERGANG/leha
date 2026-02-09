
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

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
  async chat(message: string) {
    const ai = getAI();
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
    const response = await chat.sendMessage({ message });
    return response.text;
  },

  async analyzeStyle(imageData: string): Promise<string> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
            { text: "Оцени это фото. Насколько этот 'Лёха' чёткий? Придерись к одежде, лицу или фону. Выдай вердикт в процентах и напиши едкий комментарий. Будь токсичным, но смешным." }
          ]
        },
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      return response.text || "Даже сканер завис от такой нечёткости, Лёх.";
    } catch {
      return "Сканер отвалился. Лёха опять что-то сломал.";
    }
  },

  async generateCrazyLekha(prompt: string): Promise<string | null> {
    const ai = getAI();
    const fullPrompt = `Абсурдная, карикатурная фотография русского парня по имени Лёха, который находится в максимально нелепой ситуации: ${prompt}. Стиль: гиперреализм, но с юмором, яркие цвета, пацанская эстетика.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

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

  async getLekhaQuote(): Promise<string> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Придумай одну смешную пацанскую цитату специально для Лёхи, которая его подкалывает.",
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      return response.text || "Лёха, ты где?";
    } catch {
      return "Цитатник умер. Лёха, походу без вдохновения.";
    }
  }
};
