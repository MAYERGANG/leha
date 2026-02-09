
export enum LekhaFeature {
  CHAT = 'CHAT',
  VISION = 'VISION',
  GALLERY = 'GALLERY',
  WISDOM = 'WISDOM'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface LekhaAnalysis {
  rating: number;
  comment: string;
  advice: string;
}
