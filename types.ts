export enum GameType {
  QUIZ = 'QUIZ',
  MATCHING = 'MATCHING',
  TRUE_FALSE = 'TRUE_FALSE',
  FLASHCARD = 'FLASHCARD',
  SEQUENCE = 'SEQUENCE',
  CLOZE = 'CLOZE',
  MIXED = 'MIXED' // New type for combined games
}

export interface GameSettings {
  timeLimit?: number; // in seconds, 0 for no limit
  randomizeOrder?: boolean;
  allowRetry?: boolean;
  caseSensitive?: boolean; // for cloze
}

// Data structures for different game types
export interface QuizItem {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface MatchingPair {
  id: string;
  itemA: string;
  itemB: string;
}

export interface TrueFalseItem {
  statement: string;
  isTrue: boolean;
  correction?: string;
}

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface SequenceItem {
  id: string;
  text: string;
  order: number; // 0 is first, etc.
}

export interface ClozeItem {
  textParts: string[]; // ["The sky is ", " and the grass is ", "."]
  answers: string[];   // ["blue", "green"]
}

// Wrapper for a single stage in a Mixed game
export interface MixedStage {
  id: string;
  type: GameType;
  title?: string;
  data: GameData; // Recursive definition
}

// Union type for game data
export type GameData = 
  | { type: GameType.QUIZ; items: QuizItem[] }
  | { type: GameType.MATCHING; pairs: MatchingPair[] }
  | { type: GameType.TRUE_FALSE; items: TrueFalseItem[] }
  | { type: GameType.FLASHCARD; items: FlashcardItem[] }
  | { type: GameType.SEQUENCE; items: SequenceItem[]; question?: string }
  | { type: GameType.CLOZE; data: ClozeItem }
  | { type: GameType.MIXED; stages: MixedStage[] };

export interface GameModule {
  id: string; // UUID from supabase
  title: string;
  description: string;
  category: string;
  gameType: GameType;
  data: GameData;
  settings: GameSettings;
  author: string;
  author_id?: string; // Supabase User ID
  plays: number;
  likes: number; // Added for community features
  isPublic: boolean; // Added for community features
}