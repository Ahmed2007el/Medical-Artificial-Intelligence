export interface SearchResult {
  term: string;
  definition: string;
  keyPoints: string[];
  imageUrl?: string;
  sources: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  term: string;
  timestamp: number;
}

export enum Language {
  English = 'en',
  Arabic = 'ar'
}

export enum LoadingState {
  Idle = 'IDLE',
  Searching = 'SEARCHING',
  Thinking = 'THINKING',
  Success = 'SUCCESS',
  Error = 'ERROR'
}