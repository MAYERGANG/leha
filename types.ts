
export enum LekhaFeature {
  CHAT = 'CHAT',
  VISION = 'VISION',
  GALLERY = 'GALLERY',
  WISDOM = 'WISDOM'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  ts: number;
  status?: 'sending' | 'sent' | 'failed';
}

export interface LekhaAnalysis {
  rating: number;
  comment: string;
  advice: string;
}
