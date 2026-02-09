import type { IncomingMessage, ServerResponse } from 'http';
import { handleGemini } from './_geminiHandler';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return handleGemini(req, res);
}
