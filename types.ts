export enum GameType {
  QUIZ = 'QUIZ',
  MATCHING = 'MATCHING',
  TRUE_FALSE = 'TRUE_FALSE',
  FLASHCARD = 'FLASHCARD',
  SEQUENCE = 'SEQUENCE',
  CLOZE = 'CLOZE',
  SCRAMBLE = 'SCRAMBLE', // New Mode
  MIXED = 'MIXED'
}

export interface GameSettings {
  timeLimit?: number; 
  randomizeOrder?: boolean;
  allowRetry?: boolean;
  caseSensitive?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
}

// Data structures
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
  order: number;
}

export interface ClozeItem {
  textParts: string[];
  answers: string[];
}

export interface ScrambleItem {
  word: string;
  hint?: string;
}

export interface MixedStage {
  id: string;
  type: GameType;
  title?: string;
  data: GameData; 
}

export type GameData = 
  | { type: GameType.QUIZ; items: QuizItem[] }
  | { type: GameType.MATCHING; pairs: MatchingPair[] }
  | { type: GameType.TRUE_FALSE; items: TrueFalseItem[] }
  | { type: GameType.FLASHCARD; items: FlashcardItem[] }
  | { type: GameType.SEQUENCE; items: SequenceItem[]; question?: string }
  | { type: GameType.CLOZE; data: ClozeItem }
  | { type: GameType.SCRAMBLE; items: ScrambleItem[] }
  | { type: GameType.MIXED; stages: MixedStage[] };

export interface GameModule {
  id: string;
  title: string;
  description: string;
  category: string;
  gameType: GameType;
  data: GameData;
  settings: GameSettings;
  author: string; // Display name (legacy or fallback)
  author_id?: string;
  plays: number;
  isPublic: boolean;
}