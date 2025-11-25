import { GoogleGenAI, Type } from "@google/genai";
import { GameType, GameData, QuizItem, MatchingPair, TrueFalseItem, FlashcardItem } from "../types";

const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

// Schemas for structured output
const quizSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswer"]
      }
    }
  }
};

const matchingSchema = {
  type: Type.OBJECT,
  properties: {
    pairs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          itemA: { type: Type.STRING },
          itemB: { type: Type.STRING }
        },
        required: ["id", "itemA", "itemB"]
      }
    }
  }
};

const trueFalseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          statement: { type: Type.STRING },
          isTrue: { type: Type.BOOLEAN },
          correction: { type: Type.STRING }
        },
        required: ["statement", "isTrue"]
      }
    }
  }
};

const flashcardSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING }
        },
        required: ["front", "back"]
      }
    }
  }
};

export const generateGameContent = async (
  topic: string, 
  gameType: GameType,
  level: string = "intermediate"
): Promise<GameData> => {
  
  const model = "gemini-2.5-flash";
  let prompt = "";
  let schema = null;

  switch (gameType) {
    case GameType.QUIZ:
      prompt = `Create a multiple choice quiz about "${topic}". Difficulty: ${level}. Generate 5 questions.`;
      schema = quizSchema;
      break;
    case GameType.MATCHING:
      prompt = `Create a matching pairs game about "${topic}". Difficulty: ${level}. Generate 6 pairs. Ensure itemA and itemB are related concepts (e.g., Country -> Capital, Word -> Definition).`;
      schema = matchingSchema;
      break;
    case GameType.TRUE_FALSE:
      prompt = `Create a True/False game about "${topic}". Difficulty: ${level}. Generate 6 statements. Mix true and false statements.`;
      schema = trueFalseSchema;
      break;
    case GameType.FLASHCARD:
      prompt = `Create study flashcards about "${topic}". Difficulty: ${level}. Generate 8 cards with terms on front and definitions on back.`;
      schema = flashcardSchema;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema as any, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);

    // Map strict JSON to our internal types
    switch (gameType) {
      case GameType.QUIZ:
        return { type: GameType.QUIZ, items: parsed.items as QuizItem[] };
      case GameType.MATCHING:
        return { type: GameType.MATCHING, pairs: parsed.pairs as MatchingPair[] };
      case GameType.TRUE_FALSE:
        return { type: GameType.TRUE_FALSE, items: parsed.items as TrueFalseItem[] };
      case GameType.FLASHCARD:
        return { type: GameType.FLASHCARD, items: parsed.items as FlashcardItem[] };
      default:
        throw new Error("Unknown game type");
    }

  } catch (error) {
    console.error("Error generating game:", error);
    throw error;
  }
};